// PDF History Management
class PDFHistoryManager {
    constructor() {
        this.storageKey = 'akillitest-pdf-history';
        this.maxHistoryItems = 10;
    }

    // PDF geçmişini localStorage'dan yükle
    loadPDFHistory() {
        try {
            const history = localStorage.getItem(this.storageKey);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('PDF geçmişi yüklenirken hata:', error);
            return [];
        }
    }

    // PDF'i geçmişe kaydet
    savePDFToHistory(file, pdfData) {
        const history = this.loadPDFHistory();
        
        const pdfItem = {
            id: Date.now().toString(),
            name: file.name,
            size: this.formatFileSize(file.size),
            date: new Date().toLocaleDateString('tr-TR'),
            timestamp: Date.now(),
            data: pdfData // Base64 encoded PDF data
        };

        // Aynı isimde PDF varsa kaldır
        const filteredHistory = history.filter(item => item.name !== file.name);
        
        // Yeni PDF'i başa ekle
        filteredHistory.unshift(pdfItem);
        
        // Maksimum sayıda tut
        const limitedHistory = filteredHistory.slice(0, this.maxHistoryItems);
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(limitedHistory));
            return true;
        } catch (error) {
            console.error('PDF geçmişe kaydedilirken hata:', error);
            // Storage doluysa eski öğeleri sil ve tekrar dene
            this.clearOldItems();
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(limitedHistory.slice(0, 5)));
                return true;
            } catch (secondError) {
                console.error('PDF geçmişe kaydedilemedi:', secondError);
                return false;
            }
        }
    }

    // Geçmişi temizle
    clearHistory() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Geçmiş temizlenirken hata:', error);
            return false;
        }
    }

    // Eski öğeleri temizle (storage alanı için)
    clearOldItems() {
        const history = this.loadPDFHistory();
        const recentHistory = history.slice(0, 3); // Sadece son 3 öğeyi tut
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(recentHistory));
        } catch (error) {
            console.error('Eski öğeler temizlenirken hata:', error);
        }
    }

    // Dosya boyutunu formatla
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // PDF'i geçmişten yükle
    loadPDFFromHistory(id) {
        const history = this.loadPDFHistory();
        return history.find(item => item.id === id);
    }

    // Geçmiş öğesini sil
    removeFromHistory(id) {
        const history = this.loadPDFHistory();
        const filteredHistory = history.filter(item => item.id !== id);
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(filteredHistory));
            return true;
        } catch (error) {
            console.error('Geçmişten silinirken hata:', error);
            return false;
        }
    }
}

// Enhanced Progress Manager
class ProgressManager {
    constructor() {
        this.currentStep = 0;
        this.totalSteps = 3;
        this.stepNames = ['loading', 'parsing', 'rendering'];
    }

    updateProgress(step, percentage, message = '') {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const processingTitle = document.getElementById('processing-title');
        
        // Adım güncelle
        if (step !== this.currentStep) {
            this.updateStep(step);
            this.currentStep = step;
        }
        
        // İlerleme çubuğunu güncelle
        if (progressFill) {
            const totalProgress = ((step * 100) + percentage) / this.totalSteps;
            progressFill.style.width = `${Math.min(totalProgress, 100)}%`;
        }
        
        // Yüzde metnini güncelle
        if (progressText) {
            const totalProgress = Math.round(((step * 100) + percentage) / this.totalSteps);
            progressText.textContent = `${Math.min(totalProgress, 100)}%`;
        }
        
        // Başlığı güncelle
        if (processingTitle && message) {
            processingTitle.textContent = message;
        }
    }

    updateStep(activeStep) {
        this.stepNames.forEach((stepName, index) => {
            const stepElement = document.getElementById(`step-${stepName}`);
            if (stepElement) {
                stepElement.classList.remove('active', 'completed');
                
                if (index < activeStep) {
                    stepElement.classList.add('completed');
                } else if (index === activeStep) {
                    stepElement.classList.add('active');
                }
            }
        });
    }

    reset() {
        this.currentStep = 0;
        this.updateProgress(0, 0, 'PDF Yükleniyor...');
    }

    complete() {
        this.updateProgress(2, 100, 'Tamamlandı!');
        setTimeout(() => {
            this.stepNames.forEach(stepName => {
                const stepElement = document.getElementById(`step-${stepName}`);
                if (stepElement) {
                    stepElement.classList.remove('active');
                    stepElement.classList.add('completed');
                }
            });
        }, 500);
    }
}
