// PDF Region Selector Application - Clean Version
class PDFRegionSelectorApp {
    constructor() {
        this.pdfPages = [];
        // Selection state
        this.selectedRegions = [];
        this.selectionHistory = []; // Geri alma için geçmiş
        this.currentRegionIndex = 0;
        this.isDrawing = false;
        this.startPoint = null;
        this.currentCanvas = null;
        this.currentRect = null;
        this.selectionModeEnabled = true; // Kareye alma modu
        this.currentPageIndex = 0;
        
        // Zoom functionality
        this.currentZoom = 1;
        this.maxZoom = 3;
        this.minZoom = 0.5;
        this.zoomStep = 0.25;
        
        // Draggable controls state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.zoomControlsElement = null;
        
        // Scrolling state
        this.isScrolling = false;
        this.scrollStartY = 0;
        this.scrollStartTime = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.createToastContainer();
        this.initializeSelectionMode();
    }

    initializeSelectionMode() {
        // Initialize selection mode button state
        const selectionModeBtn = document.getElementById('selection-mode-btn');
        if (selectionModeBtn) {
            // Set initial state based on selectionModeEnabled
            if (this.selectionModeEnabled) {
                selectionModeBtn.classList.add('active');
                selectionModeBtn.classList.remove('inactive');
                selectionModeBtn.title = 'Kareye Alma Modu Aktif - Kapatmak için tıklayın';
            } else {
                selectionModeBtn.classList.remove('active');
                selectionModeBtn.classList.add('inactive');
                selectionModeBtn.title = 'Kareye Alma Modu Kapalı - Açmak için tıklayın';
            }
        }
        
        // Initialize PDF container and canvas behavior
        setTimeout(() => {
            this.updatePDFContainerBehavior();
            this.updateCanvasCursors();
        }, 100);
    }

    initializeElements() {
        // Upload elements
        this.uploadSection = document.getElementById('upload-section');
        this.pdfInput = document.getElementById('pdf-input');
        this.processingStatus = document.getElementById('processing-status');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.processingTitle = document.getElementById('processing-title');
        this.processingDescription = document.getElementById('processing-description');

        // Selection elements
        this.selectionSection = document.getElementById('selection-section');
        this.pdfContainer = document.getElementById('pdf-container');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        // Note: clearBtn and backBtn are now handled dynamically in setupEventListeners
        this.undoBtn = document.getElementById('undo-btn');
        
        // Fullscreen elements
        this.fullscreenSection = document.getElementById('fullscreen-section');
        this.fullscreenImage = document.getElementById('fullscreen-image');
        this.regionCounter = document.getElementById('region-counter');
        this.totalRegionsSpan = document.getElementById('total-regions');
        this.prevRegionBtn = document.getElementById('prev-region-btn');
        this.nextRegionBtn = document.getElementById('next-region-btn');
        // Note: backToSelectionBtn is now exit-fullscreen-btn, handled dynamically
        this.zoomInBtn = document.getElementById('zoom-in-btn');
        this.zoomOutBtn = document.getElementById('zoom-out-btn');
        this.zoomResetBtn = document.getElementById('zoom-reset-btn');
    }

    setupEventListeners() {
        // PDF input
        if (this.pdfInput) {
            this.pdfInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Selection buttons
        if (this.fullscreenBtn) this.fullscreenBtn.addEventListener('click', () => this.showFullscreen());
        
        // Clear button - updated selector for new layout
        const clearBtn = document.getElementById('clear-selections-btn');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearSelections());
        
        // Back/New PDF button - updated selector for new layout
        const backBtn = document.getElementById('back-to-upload');
        if (backBtn) backBtn.addEventListener('click', () => this.backToUpload());
        
        if (this.undoBtn) this.undoBtn.addEventListener('click', () => this.undoLastSelection());
        
        // Selection mode toggle button
        const selectionModeBtn = document.getElementById('selection-mode-btn');
        if (selectionModeBtn) {
            selectionModeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleSelectionMode();
            });
        }

        // Fullscreen buttons
        if (this.prevRegionBtn) this.prevRegionBtn.addEventListener('click', () => this.previousRegion());
        if (this.nextRegionBtn) this.nextRegionBtn.addEventListener('click', () => this.nextRegion());
        
        // Exit fullscreen button - updated selector for new layout
        const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');
        if (exitFullscreenBtn) exitFullscreenBtn.addEventListener('click', () => this.backToSelection());

        // Zoom buttons
        if (this.zoomInBtn) this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (this.zoomOutBtn) this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (this.zoomResetBtn) this.zoomResetBtn.addEventListener('click', () => this.zoomReset());
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!this.fullscreenSection.classList.contains('hidden')) {
                    this.backToSelection();
                } else if (!this.selectionSection.classList.contains('hidden')) {
                    this.backToUpload();
                }
            } else if (e.key === 'ArrowLeft') {
                if (!this.fullscreenSection.classList.contains('hidden')) {
                    this.previousRegion();
                }
            } else if (e.key === 'ArrowRight') {
                if (!this.fullscreenSection.classList.contains('hidden')) {
                    this.nextRegion();
                }
            } else if (e.key === 'c' || e.key === 'C') {
                this.clearSelections();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                this.undoLastSelection();
            } else if (e.key === '+' || e.key === '=') {
                if (!this.fullscreenSection.classList.contains('hidden')) {
                    this.zoomIn();
                }
            } else if (e.key === '-') {
                if (!this.fullscreenSection.classList.contains('hidden')) {
                    this.zoomOut();
                }
            } else if (e.key === '0') {
                if (!this.fullscreenSection.classList.contains('hidden')) {
                    this.zoomReset();
                }
            }
        });
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            this.showToast('Lütfen geçerli bir PDF dosyası seçin', 'error');
            return;
        }

        try {
            await this.processPDF(file);
        } catch (error) {
            console.error('PDF processing error:', error);
            this.showToast('PDF işlenirken hata oluştu', 'error');
            this.hideProcessing();
        }
    }

    async processPDF(file) {
        this.showProcessing();
        this.updateProgress(0, 'PDF dosyası okunuyor...');

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        this.pdfPages = [];
        const totalPages = pdf.numPages;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            this.updateProgress((pageNum - 1) / totalPages * 100, `Sayfa ${pageNum}/${totalPages} işleniyor...`);
            
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 });
            
            // A4 boyutuna göre ölçekle (yaklaşık 800px genişlik)
            const scale = 800 / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            await page.render({
                canvasContext: context,
                viewport: scaledViewport
            }).promise;

            // Canvas'ı image URL'ye çevir
            const imageUrl = canvas.toDataURL('image/png');
            
            this.pdfPages.push({
                pageNumber: pageNum,
                canvas: canvas,
                imageUrl: imageUrl,
                width: scaledViewport.width,
                height: scaledViewport.height
            });
        }

        this.updateProgress(100, 'PDF hazırlanıyor...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.hideProcessing();
        this.showSelectionSection();
        this.showToast('PDF başarıyla yüklendi!', 'success');
    }

    showProcessing() {
        this.uploadSection.classList.add('hidden');
        this.processingStatus.classList.remove('hidden');
    }

    hideProcessing() {
        this.processingStatus.classList.add('hidden');
    }

    updateProgress(percentage, message) {
        if (this.progressFill) {
            this.progressFill.style.width = `${percentage}%`;
        }
        if (this.progressText) {
            this.progressText.textContent = `${Math.round(percentage)}%`;
        }
        if (this.processingDescription) {
            this.processingDescription.textContent = message;
        }
    }

    showSelectionSection() {
        this.selectionSection.classList.remove('hidden');
        this.renderPDFPages();
        this.updateSelectionUI();
    }

    renderPDFPages() {
        this.pdfContainer.innerHTML = '';
        
        this.pdfPages.forEach((page, index) => {
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page-container';
            
            const canvas = document.createElement('canvas');
            canvas.width = page.width;
            canvas.height = page.height;
            canvas.className = 'pdf-page-canvas';
            canvas.dataset.pageIndex = index;
            
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                this.redrawPageCanvas(canvas, index);
            };
            img.src = page.imageUrl;
            
            // Mouse events for drawing and scrolling
            canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e, canvas, index));
            canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, canvas, index));
            canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e, canvas, index));
            canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e, canvas, index));
            
            // Touch events for mobile/smartboard
            canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e, canvas, index));
            canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e, canvas, index));
            canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e, canvas, index));
            
            pageContainer.appendChild(canvas);
            this.pdfContainer.appendChild(pageContainer);
        });
        
        // Initialize container and canvas behavior after rendering
        setTimeout(() => {
            this.updatePDFContainerBehavior();
            this.updateCanvasCursors();
        }, 100);
    }

    toggleSelectionMode() {
        this.selectionModeEnabled = !this.selectionModeEnabled;
        
        const selectionModeBtn = document.getElementById('selection-mode-btn');
        
        if (selectionModeBtn) {
            // Clear all classes first
            selectionModeBtn.classList.remove('active', 'inactive');
            
            if (this.selectionModeEnabled) {
                selectionModeBtn.classList.add('active');
                selectionModeBtn.title = 'Kareye Alma Modu Aktif - Kapatmak için tıklayın';
                this.showToast('Kareye alma modu açıldı', 'success');
            } else {
                selectionModeBtn.classList.add('inactive');
                selectionModeBtn.title = 'Kareye Alma Modu Kapalı - Açmak için tıklayın';
                this.showToast('Kareye alma modu kapatıldı - Mouse ile kaydırabilirsiniz', 'info');
            }
        }
        
        // Update PDF container and canvas behavior
        this.updatePDFContainerBehavior();
        this.updateCanvasCursors();
    }

    updatePDFContainerBehavior() {
        const pdfContainer = document.getElementById('pdf-container');
        if (pdfContainer) {
            if (this.selectionModeEnabled) {
                pdfContainer.style.overflowY = 'hidden';
                pdfContainer.style.touchAction = 'none';
                pdfContainer.classList.add('selection-mode');
                pdfContainer.classList.remove('scroll-mode');
            } else {
                pdfContainer.style.overflowY = 'auto';
                pdfContainer.style.touchAction = 'pan-y';
                pdfContainer.classList.add('scroll-mode');
                pdfContainer.classList.remove('selection-mode');
            }
        }
    }

    updateCanvasCursors() {
        const canvases = document.querySelectorAll('.pdf-page-canvas');
        canvases.forEach(canvas => {
            if (this.selectionModeEnabled) {
                canvas.style.cursor = 'crosshair';
                canvas.classList.add('selection-mode');
                canvas.classList.remove('scroll-mode');
            } else {
                canvas.style.cursor = 'grab';
                canvas.classList.add('scroll-mode');
                canvas.classList.remove('selection-mode');
            }
        });
    }

    // Mouse event handlers for both drawing and scrolling
    handleMouseDown(e, canvas, pageIndex) {
        if (this.selectionModeEnabled) {
            this.startDrawing(e, canvas, pageIndex);
        } else {
            this.startScrolling(e, canvas);
        }
    }

    handleMouseMove(e, canvas, pageIndex) {
        if (this.selectionModeEnabled) {
            this.draw(e, canvas, pageIndex);
        } else {
            this.continueScrolling(e, canvas);
        }
    }

    handleMouseUp(e, canvas, pageIndex) {
        if (this.selectionModeEnabled) {
            this.stopDrawing(e, canvas, pageIndex);
        } else {
            this.stopScrolling(e, canvas);
        }
    }

    handleMouseLeave(e, canvas, pageIndex) {
        if (this.selectionModeEnabled) {
            this.isDrawing = false;
        } else {
            this.stopScrolling(e, canvas);
        }
    }

    // Touch event handlers for smartboard
    handleTouchStart(e, canvas, pageIndex) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent, canvas, pageIndex);
    }

    handleTouchMove(e, canvas, pageIndex) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent, canvas, pageIndex);
    }

    handleTouchEnd(e, canvas, pageIndex) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {
            clientX: 0,
            clientY: 0
        });
        this.handleMouseUp(mouseEvent, canvas, pageIndex);
    }

    // Scrolling functionality for when selection mode is disabled
    startScrolling(e, canvas) {
        this.isScrolling = true;
        this.scrollStartY = e.clientY;
        this.scrollStartTime = Date.now();
        this.pdfContainer.style.cursor = 'grabbing';
        canvas.style.cursor = 'grabbing';
    }

    continueScrolling(e, canvas) {
        if (!this.isScrolling) return;
        
        const deltaY = this.scrollStartY - e.clientY;
        const scrollSensitivity = 1.5; // Adjust scroll sensitivity
        
        // Get the correct scrollable container
        const scrollContainer = document.querySelector('.pdf-scrollable-container') || this.pdfContainer.parentElement || this.pdfContainer;
        
        // Scroll the container
        scrollContainer.scrollTop += deltaY * scrollSensitivity;
        
        // Update start position for smooth scrolling
        this.scrollStartY = e.clientY;
    }

    stopScrolling(e, canvas) {
        if (!this.isScrolling) return;
        
        this.isScrolling = false;
        this.pdfContainer.style.cursor = '';
        canvas.style.cursor = 'grab';
        
        // Add momentum scrolling for better UX
        const scrollTime = Date.now() - this.scrollStartTime;
        if (scrollTime < 200) { // Quick gesture
            const deltaY = this.scrollStartY - e.clientY;
            const momentum = deltaY * 2;
            
            // Smooth momentum scroll
            let currentMomentum = momentum;
            const momentumScroll = () => {
                if (Math.abs(currentMomentum) > 1) {
                    this.pdfContainer.scrollTop += currentMomentum;
                    currentMomentum *= 0.9; // Decay
                    requestAnimationFrame(momentumScroll);
                }
            };
            requestAnimationFrame(momentumScroll);
        }
    }

    startDrawing(e, canvas, pageIndex) {
        if (!this.selectionModeEnabled) {
            return; // Kareye alma modu kapalıysa çizim yapma
        }
        
        this.isDrawing = true;
        this.currentCanvas = canvas;
        this.currentPageIndex = pageIndex;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        this.startPoint = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    draw(e, canvas, pageIndex) {
        if (!this.selectionModeEnabled || !this.isDrawing || canvas !== this.currentCanvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const currentPoint = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };

        // Clear and redraw this page
        this.redrawPageCanvas(canvas, pageIndex);

        // Draw current rectangle
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            this.startPoint.x,
            this.startPoint.y,
            currentPoint.x - this.startPoint.x,
            currentPoint.y - this.startPoint.y
        );
    }

    stopDrawing(e, canvas, pageIndex) {
        if (!this.selectionModeEnabled || !this.isDrawing || canvas !== this.currentCanvas) return;
        this.isDrawing = false;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const endPoint = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };

        // Create selection rectangle
        const selection = {
            x: Math.min(this.startPoint.x, endPoint.x),
            y: Math.min(this.startPoint.y, endPoint.y),
            width: Math.abs(endPoint.x - this.startPoint.x),
            height: Math.abs(endPoint.y - this.startPoint.y)
        };

        // Only add if rectangle is large enough
        if (selection.width > 10 && selection.height > 10) {
            // Add page information to selection
            selection.pageIndex = pageIndex;
            this.saveSelectionState();
            this.selectedRegions.push(selection);
            this.updateSelectionUI();
            this.redrawPageCanvas(canvas, pageIndex);
            this.showToast(`Bölge ${this.selectedRegions.length} seçildi`, 'success');
        }
    }

    redrawPageCanvas(canvas, pageIndex) {
        const ctx = canvas.getContext('2d');
        const page = this.pdfPages[pageIndex];
        
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            // Draw selections for this page
            this.selectedRegions.forEach((region, index) => {
                if (region.pageIndex === pageIndex) {
                    ctx.strokeStyle = '#007bff';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([]);
                    ctx.strokeRect(region.x, region.y, region.width, region.height);
                    
                    // Draw number
                    ctx.fillStyle = '#007bff';
                    ctx.font = 'bold 20px Arial';
                    ctx.fillText(index + 1, region.x + 10, region.y + 30);
                }
            });
        };
        img.src = page.imageUrl;
    }

    redrawAllPages() {
        this.pdfPages.forEach((page, index) => {
            const canvas = this.pdfContainer.querySelector(`canvas[data-page-index="${index}"]`);
            if (canvas) {
                this.redrawPageCanvas(canvas, index);
            }
        });
    }

    updateSelectionUI() {
        if (this.fullscreenBtn) this.fullscreenBtn.disabled = this.selectedRegions.length === 0;
        if (this.totalRegionsSpan) this.totalRegionsSpan.textContent = this.selectedRegions.length;
        if (this.undoBtn) {
            this.undoBtn.style.display = this.selectionHistory.length > 0 ? 'flex' : 'none';
        }
    }

    clearSelections() {
        this.saveSelectionState();
        this.selectedRegions = [];
        this.redrawAllPages();
        this.updateSelectionUI();
        this.showToast('Tüm seçimler temizlendi', 'info');
    }

    saveSelectionState() {
        this.selectionHistory.push(JSON.parse(JSON.stringify(this.selectedRegions)));
        if (this.selectionHistory.length > 10) {
            this.selectionHistory.shift();
        }
    }

    undoLastSelection() {
        if (this.selectionHistory.length > 0) {
            this.selectedRegions = this.selectionHistory.pop();
            this.redrawAllPages();
            this.updateSelectionUI();
            this.showToast('Son işlem geri alındı', 'success');
        } else {
            this.showToast('Geri alınacak işlem yok', 'info');
        }
    }

    showFullscreen() {
        if (this.selectedRegions.length === 0) return;
        
        this.selectionSection.classList.add('hidden');
        this.fullscreenSection.classList.remove('hidden');
        this.currentRegionIndex = 0;
        this.showCurrentRegion();
        
        setTimeout(() => {
            this.setupDraggableControls();
        }, 100);
    }

    showCurrentRegion() {
        if (this.selectedRegions.length === 0) return;
        
        const region = this.selectedRegions[this.currentRegionIndex];
        const page = this.pdfPages[region.pageIndex];
        
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        
        cropCanvas.width = region.width;
        cropCanvas.height = region.height;
        
        const img = new Image();
        img.onload = () => {
            cropCtx.drawImage(
                img,
                region.x, region.y, region.width, region.height,
                0, 0, region.width, region.height
            );
            
            this.fullscreenImage.src = cropCanvas.toDataURL('image/png');
        };
        img.src = page.imageUrl;
        
        this.regionCounter.textContent = this.currentRegionIndex + 1;
        this.totalRegionsSpan.textContent = this.selectedRegions.length;
        
        this.prevRegionBtn.disabled = this.currentRegionIndex === 0;
        this.nextRegionBtn.disabled = this.currentRegionIndex === this.selectedRegions.length - 1;
    }

    previousRegion() {
        if (this.currentRegionIndex > 0) {
            this.currentRegionIndex--;
            this.showCurrentRegion();
        }
    }

    nextRegion() {
        if (this.currentRegionIndex < this.selectedRegions.length - 1) {
            this.currentRegionIndex++;
            this.showCurrentRegion();
        }
    }

    backToSelection() {
        this.fullscreenSection.classList.add('hidden');
        this.selectionSection.classList.remove('hidden');
        
        if (this.zoomControlsElement) {
            this.zoomControlsElement.style.position = '';
            this.zoomControlsElement.style.left = '';
            this.zoomControlsElement.style.top = '';
            this.zoomControlsElement.style.zIndex = '';
            
            const dragHandle = this.zoomControlsElement.querySelector('.drag-handle');
            if (dragHandle) {
                dragHandle.remove();
            }
        }
    }

    backToUpload() {
        this.pdfPages = [];
        this.selectedRegions = [];
        this.selectionHistory = [];
        this.currentRegionIndex = 0;
        
        this.selectionSection.classList.add('hidden');
        this.fullscreenSection.classList.add('hidden');
        this.uploadSection.classList.remove('hidden');
        
        this.pdfContainer.innerHTML = '';
        this.pdfInput.value = '';
    }

    // Zoom functionality
    zoomIn() {
        if (this.currentZoom < this.maxZoom) {
            this.currentZoom = Math.min(this.maxZoom, this.currentZoom + this.zoomStep);
            this.applyZoom();
        }
    }

    zoomOut() {
        if (this.currentZoom > this.minZoom) {
            this.currentZoom = Math.max(this.minZoom, this.currentZoom - this.zoomStep);
            this.applyZoom();
        }
    }

    zoomReset() {
        this.currentZoom = 1;
        this.applyZoom();
    }

    applyZoom() {
        if (this.fullscreenImage) {
            this.fullscreenImage.style.transform = `scale(${this.currentZoom})`;
            
            if (this.zoomInBtn) this.zoomInBtn.disabled = this.currentZoom >= this.maxZoom;
            if (this.zoomOutBtn) this.zoomOutBtn.disabled = this.currentZoom <= this.minZoom;
        }
    }

    // Draggable controls
    setupDraggableControls() {
        this.zoomControlsElement = document.querySelector('.zoom-controls');
        if (!this.zoomControlsElement) return;
        
        this.zoomControlsElement.style.cursor = 'move';
        
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
        this.zoomControlsElement.insertBefore(dragHandle, this.zoomControlsElement.firstChild);
        
        this.zoomControlsElement.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        const buttons = this.zoomControlsElement.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.stopPropagation());
        });
    }

    startDrag(e) {
        if (e.target.closest('button')) return;
        
        this.isDragging = true;
        const rect = this.zoomControlsElement.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.zoomControlsElement.style.transition = 'none';
        this.zoomControlsElement.style.position = 'fixed';
        this.zoomControlsElement.style.zIndex = '2002';
        
        e.preventDefault();
    }

    drag(e) {
        if (!this.isDragging || !this.zoomControlsElement) return;
        
        // Prevent default to avoid any browser drag behavior
        e.preventDefault();
        e.stopPropagation();
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // Get current viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const elementWidth = this.zoomControlsElement.offsetWidth;
        const elementHeight = this.zoomControlsElement.offsetHeight;
        
        // Keep controls within screen bounds with padding
        const padding = 10;
        const maxX = viewportWidth - elementWidth - padding;
        const maxY = viewportHeight - elementHeight - padding;
        
        const clampedX = Math.max(padding, Math.min(x, maxX));
        const clampedY = Math.max(padding, Math.min(y, maxY));
        
        // Apply position immediately without transition
        this.zoomControlsElement.style.left = clampedX + 'px';
        this.zoomControlsElement.style.top = clampedY + 'px';
        this.zoomControlsElement.style.transform = 'none';
    }

    stopDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.zoomControlsElement.style.transition = 'all 0.3s ease';
    }

    // Toast notification system
    createToastContainer() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        }[type] || 'ℹ';
        
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pdfApp = new PDFRegionSelectorApp();
});
