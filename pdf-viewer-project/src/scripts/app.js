document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('file-input');
  const pdfContainer = document.getElementById('pdf-container');
  const pdfCanvas = document.getElementById('pdf-canvas');
  const annotationCanvas = document.getElementById('annotation-canvas');
  const pdfContext = pdfCanvas.getContext('2d');
  const annotationContext = annotationCanvas.getContext('2d');
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');
  const pageNumDisplay = document.getElementById('page-num');
  const pageCountDisplay = document.getElementById('page-count');

  let pdfDoc = null;
  let currentPage = 1;
  // 此 scale 也用於計算 FieldSetting 座標
  let scale = 1.5;
  // 儲存標記，每筆記錄同時保存 canvas 座標 (像素) 與 FieldSetting 座標計算用 (待計算)
  let annotations = {};

  // 用於預覽的臨時標籤與刪除按鈕
  let tempRectLabel = null;
  let tempDeleteButton = null;

  enableDrawing();

  fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const fileReader = new FileReader();
      fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);

        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
          pdfDoc = pdf;
          pageCountDisplay.textContent = pdf.numPages;
          renderPage(currentPage);

          // 檢查第一頁的簽章欄位
          pdf.getPage(1).then(page => {
            page.getAnnotations().then(annotations => {
              annotations.forEach(annot => {
                // 根據 PDF 規範，數位簽章欄位通常屬於 Widget annotation 且 fieldType 為 'Sig'
                if (annot.subtype === 'Widget' && annot.fieldType === 'Sig') {
                  console.log('找到簽章欄位:', annot);
                  // 你可以在 annot 中嘗試尋找 /V 或其他相關屬性
                  // 例如：annot.fieldValue 可能會包含部分簽章資訊
                }
              });
            });
          });
        });
      };
      fileReader.readAsArrayBuffer(file);
    }
  });

  function renderPage(pageNum) {
    pdfDoc.getPage(pageNum).then(function(page) {
      const viewport = page.getViewport({ scale: scale });

      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      annotationCanvas.width = viewport.width;
      annotationCanvas.height = viewport.height;

      // 調整容器大小
      pdfContainer.style.width = viewport.width + 'px';
      pdfContainer.style.height = viewport.height + 'px';

      const renderContext = {
        canvasContext: pdfContext,
        viewport: viewport
      };

      page.render(renderContext).promise.then(function() {
        displayAnnotations(pageNum);
      });

      pageNumDisplay.textContent = pageNum;
    });
  }

  // 清除容器內所有標籤與按鈕
  function clearAnnotationElements() {
    const labels = pdfContainer.querySelectorAll('.annotation-label');
    labels.forEach(label => label.remove());

    const buttons = pdfContainer.querySelectorAll('.delete-button');
    buttons.forEach(button => button.remove());
  }

  // 顯示永久標記：在 Canvas 上繪製矩形並產生 FieldSetting 座標的標籤與刪除按鈕
  function displayAnnotations(pageNum) {
    annotationContext.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
    clearAnnotationElements();

    if (annotations[pageNum]) {
      annotations[pageNum].forEach(function(rect, index) {
        // 在 Canvas 上繪製矩形 (原始為左上原點)
        annotationContext.strokeRect(rect.startX, rect.startY, rect.width, rect.height);

        // 將 Canvas 座標還原到 PDF 原始尺寸（FieldSetting 座標以左下為原點）
        const x1_val = rect.startX / scale;
        const y1_val = (annotationCanvas.height - (rect.startY + rect.height)) / scale;
        const x2_val = (rect.startX + rect.width) / scale;
        const y2_val = (annotationCanvas.height - rect.startY) / scale;

        const rectLabel = document.createElement('div');
        rectLabel.classList.add('annotation-label');
        rectLabel.textContent = `[${x1_val.toFixed(2)}, ${y1_val.toFixed(2)}, ${x2_val.toFixed(2)}, ${y2_val.toFixed(2)}]`;
        // 定位標籤於矩形右側
        rectLabel.style.left = (rect.startX + rect.width + 10) + 'px';
        rectLabel.style.top = (rect.startY + 20) + 'px';
        pdfContainer.appendChild(rectLabel);

        // 建立刪除按鈕
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = 'x';
        deleteButton.style.left = (rect.startX + rect.width + 10) + 'px';
        deleteButton.style.top = rect.startY + 'px';
        deleteButton.addEventListener('click', function() {
          annotations[pageNum].splice(index, 1);
          displayAnnotations(pageNum);
        });
        pdfContainer.appendChild(deleteButton);
      });
    }
  }

  // 僅重繪 Canvas 上的永久矩形，不產生 DOM 元素 (用於預覽)
  function drawPermanentAnnotationsOnCanvas(pageNum) {
    annotationContext.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
    if (annotations[pageNum]) {
      annotations[pageNum].forEach(function(rect) {
        annotationContext.strokeRect(rect.startX, rect.startY, rect.width, rect.height);
      });
    }
  }

  prevPageButton.addEventListener('click', function() {
    if (currentPage <= 1) return;
    currentPage--;
    renderPage(currentPage);
  });

  nextPageButton.addEventListener('click', function() {
    if (currentPage >= pdfDoc.numPages) return;
    currentPage++;
    renderPage(currentPage);
  });

  function enableDrawing() {
    let startX, startY;
    let isDrawing = false;

    // 移除預覽用臨時元素
    function removeTempElements() {
      if (tempRectLabel) {
        tempRectLabel.remove();
        tempRectLabel = null;
      }
      if (tempDeleteButton) {
        tempDeleteButton.remove();
        tempDeleteButton = null;
      }
    }

    annotationCanvas.addEventListener('mousedown', function(e) {
      const containerRect = pdfContainer.getBoundingClientRect();
      startX = e.clientX - containerRect.left;
      startY = e.clientY - containerRect.top;
      isDrawing = true;

      removeTempElements();

      // 建立預覽用標籤
      tempRectLabel = document.createElement('div');
      tempRectLabel.classList.add('annotation-label');
      pdfContainer.appendChild(tempRectLabel);

      // 建立預覽用刪除按鈕（僅作位置參考）
      tempDeleteButton = document.createElement('button');
      tempDeleteButton.classList.add('delete-button');
      tempDeleteButton.textContent = 'x';
      pdfContainer.appendChild(tempDeleteButton);
    });

    annotationCanvas.addEventListener('mousemove', function(e) {
      if (!isDrawing) return;
      const containerRect = pdfContainer.getBoundingClientRect();
      const currentX = e.clientX - containerRect.left;
      const currentY = e.clientY - containerRect.top;

      // 以滑鼠拖曳的兩點計算矩形 (Canvas 左上為原點)
      let x1 = Math.min(startX, currentX);
      let x2 = Math.max(startX, currentX);
      let y_top = Math.min(startY, currentY);
      let y_bottom = Math.max(startY, currentY);

      // 先重繪永久標記作為背景
      drawPermanentAnnotationsOnCanvas(currentPage);
      // 畫出預覽矩形
      annotationContext.strokeRect(x1, y_top, x2 - x1, y_bottom - y_top);

      // FieldSetting 座標計算 (未除以 scale 前的 canvas 座標)
      const preview_x1 = x1 / scale;
      const preview_y1 = (annotationCanvas.height - y_bottom) / scale;
      const preview_x2 = x2 / scale;
      const preview_y2 = (annotationCanvas.height - y_top) / scale;

      tempRectLabel.textContent = `[${preview_x1.toFixed(2)}, ${preview_y1.toFixed(2)}, ${preview_x2.toFixed(2)}, ${preview_y2.toFixed(2)}]`;
      tempRectLabel.style.left = (x2 + 10) + 'px';
      tempRectLabel.style.top = (y_top + 20) + 'px';

      // 更新預覽刪除按鈕位置（僅供參考）
      tempDeleteButton.style.left = (x2 + 10) + 'px';
      tempDeleteButton.style.top = y_top + 'px';
    });

    annotationCanvas.addEventListener('mouseup', function(e) {
      if (!isDrawing) return;
      isDrawing = false;
      const containerRect = pdfContainer.getBoundingClientRect();
      const currentX = e.clientX - containerRect.left;
      const currentY = e.clientY - containerRect.top;

      let x1 = Math.min(startX, currentX);
      let x2 = Math.max(startX, currentX);
      let y_top = Math.min(startY, currentY);
      let y_bottom = Math.max(startY, currentY);

      const newRect = {
        // Canvas 座標 (像素)
        startX: x1,
        startY: y_top,
        width: x2 - x1,
        height: y_bottom - y_top
      };

      if (!annotations[currentPage]) {
        annotations[currentPage] = [];
      }
      annotations[currentPage].push(newRect);

      removeTempElements();
      displayAnnotations(currentPage);
    });
  }
});