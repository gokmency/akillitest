// Enhanced PDF Region Selector App with History Management
class PDFRegionSelectorApp {
    constructor() {
        this.pdfPages = [];
        this.currentPageIndex = 0;
        this.selectedRegions = [];
        this.selectionHistory = [];
        this.currentRegionIndex = 0;
        this.isDrawing = false;
        this.startPoint = null;
        this.currentRect = null;
        this.canvas = null;
        this.ctx = null;
        
        // Zoom functionality
        this.currentZoom = 1;
        this.maxZoom = 3;
        this.minZoom = 0.5;
        this.zoomStep = 0.25;
        
        // Draggable controls state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.zoomControlsElement = null;
        
        // History and progress managers
        this.historyManager = new PDFHistoryManager();
        this.progressManager = new ProgressManager();
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.createToastContainer();
        this.updateRecentPDFs();
    }

    initializeElements() {
        // Upload elements
        this.uploadSection = document.getElementById('upload-section');
        this.uploadArea = document.getElementById('upload-area');
        this.pdfInput = document.getElementById('pdf-input');
        this.processingStatus = document.getElementById('processing-status');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.processingTitle = document.getElementById('processing-title');

        // Recent PDFs elements
        this.recentPDFs = document.getElementById('recent-pdfs');
        this.pdfList = document.getElementById('pdf-list');
        this.clearHistoryBtn = document.getElementById('clear-history-btn');

        // Selection elements
        this.selectionSection = document.getElementById('selection-section');
        this.pdfContainer = document.getElementById('pdf-container');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.backBtn = document.getElementById('back-btn');
        
        // Fullscreen elements
        this.fullscreenSection = document.getElementById('fullscreen-section');
        this.fullscreenImage = document.getElementById('fullscreen-image');
        this.regionCounter = document.getElementById('region-counter');
        this.totalRegionsSpan = document.getElementById('total-regions');
        this.prevRegionBtn = document.getElementById('prev-region-btn');
        this.nextRegionBtn = document.getElementById('next-region-btn');
        this.backToSelectionBtn = document.getElementById('back-to-selection-btn');
        this.zoomInBtn = document.getElementById('zoom-in-btn');
        this.zoomOutBtn = document.getElementById('zoom-out-btn');
        this.zoomResetBtn = document.getElementById('zoom-reset-btn');
    }

    setupEventListeners() {
        // PDF input
        if (this.pdfInput) {
            this.pdfInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Clear history button
        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => this.clearPDFHistory());
        }

        // Selection buttons
        if (this.fullscreenBtn) this.fullscreenBtn.addEventListener('click', () => this.showFullscreen());
        if (this.clearBtn) this.clearBtn.addEventListener('click', () => this.clearSelections());
        if (this.backBtn) this.backBtn.addEventListener('click', () => this.backToUpload());

        // Fullscreen buttons
        if (this.prevRegionBtn) this.prevRegionBtn.addEventListener('click', () => this.previousRegion());
        if (this.nextRegionBtn) this.nextRegionBtn.addEventListener('click', () => this.nextRegion());
        if (this.backToSelectionBtn) this.backToSelectionBtn.addEventListener('click', () => this.backToSelection());

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
            this.showProcessing();
            this.progressManager.reset();
            
            // Step 1: Loading
            this.progressManager.updateProgress(0, 0, 'PDF dosyası yükleniyor...');
            
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            this.progressManager.updateProgress(0, 50, 'PDF dosyası okunuyor...');
            
            // Step 2: Parsing
            this.progressManager.updateProgress(1, 0, 'PDF işleniyor...');
            
            const pdfData = await this.processPDF(arrayBuffer);
            this.progressManager.updateProgress(1, 50, 'Sayfalar hazırlanıyor...');
            
            // Step 3: Rendering
            this.progressManager.updateProgress(2, 0, 'Görüntüler oluşturuluyor...');
            
            await this.renderAllPages();
            this.progressManager.updateProgress(2, 100, 'Tamamlandı!');
            
            // Save to history
            const base64Data = this.arrayBufferToBase64(arrayBuffer);
            const saved = this.historyManager.savePDFToHistory(file, base64Data);
            
            if (saved) {
                this.updateRecentPDFs();
                this.showToast('PDF başarıyla yüklendi ve geçmişe kaydedildi', 'success');
            } else {
                this.showToast('PDF yüklendi ancak geçmişe kaydedilemedi', 'warning');
            }
            
            this.progressManager.complete();
            
            setTimeout(() => {
                this.hideProcessing();
                this.showSelection();
            }, 1000);
            
        } catch (error) {
            console.error('PDF yükleme hatası:', error);
            this.showToast('PDF yüklenirken hata oluştu: ' + error.message, 'error');
            this.hideProcessing();
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Dosya okunamadı'));
            reader.readAsArrayBuffer(file);
        });
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async processPDF(arrayBuffer) {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        this.pdfPages = [];
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            this.pdfPages.push({
                canvas: canvas,
                imageUrl: canvas.toDataURL('image/png'),
                width: viewport.width,
                height: viewport.height
            });
            
            // Update progress for each page
            const progress = (i / pdf.numPages) * 100;
            this.progressManager.updateProgress(1, 50 + (progress * 0.5), `Sayfa ${i}/${pdf.numPages} işleniyor...`);
        }
        
        return pdf;
    }

    async renderAllPages() {
        this.pdfContainer.innerHTML = '';
        
        for (let i = 0; i < this.pdfPages.length; i++) {
            const pageData = this.pdfPages[i];
            
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page-container';
            
            const canvas = document.createElement('canvas');
            canvas.width = 800; // A4 width approximation
            canvas.height = (pageData.height / pageData.width) * 800;
            canvas.dataset.pageIndex = i;
            canvas.className = 'pdf-page-canvas';
            
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            await new Promise((resolve) => {
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve();
                };
                img.src = pageData.imageUrl;
            });
            
            // Add drawing event listeners
            this.addDrawingListeners(canvas, i);
            
            pageContainer.appendChild(canvas);
            this.pdfContainer.appendChild(pageContainer);
            
            // Update progress
            const progress = ((i + 1) / this.pdfPages.length) * 100;
            this.progressManager.updateProgress(2, progress, `Sayfa ${i + 1}/${this.pdfPages.length} hazırlanıyor...`);
        }
    }

    addDrawingListeners(canvas, pageIndex) {
        canvas.addEventListener('mousedown', (e) => this.startDrawing(e, canvas, pageIndex));
        canvas.addEventListener('mousemove', (e) => this.draw(e, canvas, pageIndex));
        canvas.addEventListener('mouseup', (e) => this.stopDrawing(e, canvas, pageIndex));
        
        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        });
    }

    // PDF History Management
    updateRecentPDFs() {
        const history = this.historyManager.loadPDFHistory();
        
        if (history.length === 0) {
            this.recentPDFs.style.display = 'none';
            return;
        }
        
        this.recentPDFs.style.display = 'block';
        this.pdfList.innerHTML = '';
        
        history.forEach(item => {
            const pdfItem = document.createElement('div');
            pdfItem.className = 'pdf-item';
            pdfItem.innerHTML = `
                <div class="pdf-item-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="pdf-item-info">
                    <div class="pdf-item-name">${item.name}</div>
                    <div class="pdf-item-date">${item.date}</div>
                </div>
                <div class="pdf-item-size">${item.size}</div>
            `;
            
            pdfItem.addEventListener('click', () => this.loadPDFFromHistory(item.id));
            this.pdfList.appendChild(pdfItem);
        });
    }

    async loadPDFFromHistory(id) {
        const historyItem = this.historyManager.loadPDFFromHistory(id);
        if (!historyItem) {
            this.showToast('PDF geçmişte bulunamadı', 'error');
            return;
        }

        try {
            this.showProcessing();
            this.progressManager.reset();
            
            this.progressManager.updateProgress(0, 0, 'Geçmişten yükleniyor...');
            
            const arrayBuffer = this.base64ToArrayBuffer(historyItem.data);
            this.progressManager.updateProgress(0, 100, 'PDF hazırlanıyor...');
            
            await this.processPDF(arrayBuffer);
            this.progressManager.updateProgress(1, 100, 'Sayfalar oluşturuluyor...');
            
            await this.renderAllPages();
            this.progressManager.complete();
            
            this.showToast(`${historyItem.name} başarıyla yüklendi`, 'success');
            
            setTimeout(() => {
                this.hideProcessing();
                this.showSelection();
            }, 1000);
            
        } catch (error) {
            console.error('Geçmişten PDF yükleme hatası:', error);
            this.showToast('PDF geçmişten yüklenirken hata oluştu', 'error');
            this.hideProcessing();
        }
    }

    clearPDFHistory() {
        if (confirm('Tüm PDF geçmişini silmek istediğinizden emin misiniz?')) {
            const success = this.historyManager.clearHistory();
            if (success) {
                this.updateRecentPDFs();
                this.showToast('PDF geçmişi temizlendi', 'success');
            } else {
                this.showToast('Geçmiş temizlenirken hata oluştu', 'error');
            }
        }
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
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    // UI State Management
    showProcessing() {
        this.uploadSection.classList.remove('hidden');
        this.processingStatus.classList.remove('hidden');
        this.uploadArea.style.display = 'none';
        this.recentPDFs.style.display = 'none';
    }

    hideProcessing() {
        this.processingStatus.classList.add('hidden');
        this.uploadArea.style.display = 'block';
        this.updateRecentPDFs();
    }

    showSelection() {
        this.uploadSection.classList.add('hidden');
        this.selectionSection.classList.remove('hidden');
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
        this.hideProcessing();
    }

    // Rest of the methods would continue here...
    // (Drawing, selection, fullscreen, zoom functionality)
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new PDFRegionSelectorApp();
});
