/**
 * Slide Manager - Seçilen soru bölgelerini slayt seti olarak kaydetme ve yönetme
 */
class SlideManager {
    constructor() {
        this.storageKey = 'saved_slides';
        this.maxSlides = 20; // Maksimum 20 slayt seti
    }

    /**
     * Yeni bir slayt seti kaydet
     * @param {string} name - Slayt seti adı
     * @param {Array} regions - Seçilen bölgeler listesi
     * @param {string} pdfName - PDF dosya adı
     * @param {string} pdfData - PDF data URL'i
     * @returns {boolean} - Başarı durumu
     */
    saveSlideSet(name, regions, pdfName, pdfData) {
        try {
            const slides = this.getAllSlides();
            
            // Aynı isimde slayt var mı kontrol et
            if (slides.find(slide => slide.name === name)) {
                throw new Error('Bu isimde bir slayt seti zaten mevcut!');
            }

            const newSlide = {
                id: this.generateId(),
                name: name,
                regions: regions,
                pdfName: pdfName,
                pdfData: pdfData,
                createdAt: new Date().toISOString(),
                regionCount: regions.length
            };

            slides.push(newSlide);

            // Maksimum limit kontrolü
            if (slides.length > this.maxSlides) {
                slides.shift(); // En eski slaytı sil
            }

            localStorage.setItem(this.storageKey, JSON.stringify(slides));
            return true;
        } catch (error) {
            console.error('Slayt kaydetme hatası:', error);
            throw error;
        }
    }

    /**
     * Tüm slayt setlerini getir
     * @returns {Array} - Slayt setleri listesi
     */
    getAllSlides() {
        try {
            const slides = localStorage.getItem(this.storageKey);
            return slides ? JSON.parse(slides) : [];
        } catch (error) {
            console.error('Slayt yükleme hatası:', error);
            return [];
        }
    }

    /**
     * Belirli bir slayt setini getir
     * @param {string} id - Slayt ID'si
     * @returns {Object|null} - Slayt seti
     */
    getSlideById(id) {
        const slides = this.getAllSlides();
        return slides.find(slide => slide.id === id) || null;
    }

    /**
     * Slayt setini sil
     * @param {string} id - Slayt ID'si
     * @returns {boolean} - Başarı durumu
     */
    deleteSlide(id) {
        try {
            const slides = this.getAllSlides();
            const filteredSlides = slides.filter(slide => slide.id !== id);
            localStorage.setItem(this.storageKey, JSON.stringify(filteredSlides));
            return true;
        } catch (error) {
            console.error('Slayt silme hatası:', error);
            return false;
        }
    }

    /**
     * Tüm slaytları sil
     * @returns {boolean} - Başarı durumu
     */
    clearAllSlides() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Tüm slaytları silme hatası:', error);
            return false;
        }
    }

    /**
     * Benzersiz ID oluştur
     * @returns {string} - Benzersiz ID
     */
    generateId() {
        return 'slide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Slayt setinin boyutunu hesapla (MB)
     * @param {Object} slide - Slayt seti
     * @returns {number} - Boyut (MB)
     */
    getSlideSize(slide) {
        const jsonString = JSON.stringify(slide);
        const sizeInBytes = new Blob([jsonString]).size;
        return (sizeInBytes / (1024 * 1024)).toFixed(2);
    }

    /**
     * Toplam kullanılan depolama alanını hesapla
     * @returns {number} - Toplam boyut (MB)
     */
    getTotalStorageSize() {
        const slides = this.getAllSlides();
        let totalSize = 0;
        slides.forEach(slide => {
            totalSize += parseFloat(this.getSlideSize(slide));
        });
        return totalSize.toFixed(2);
    }
}

// Global instance
window.slideManager = new SlideManager();
