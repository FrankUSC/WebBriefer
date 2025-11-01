// WebBriefer Popup Script
class WebBrieferPopup {
    constructor() {
        this.currentTab = null;
        this.userProfile = null;
        this.pageContent = null;
        this.currentSummary = null;
        this.qaHistory = [];
        
        this.initializeElements();
        this.attachEventListeners();
        this.initialize();
    }

    initializeElements() {
        // UI Elements
        this.elements = {
            settingsBtn: document.getElementById('settingsBtn'),
            pageTitle: document.getElementById('pageTitle'),
            profileSetup: document.getElementById('profileSetup'),
            setupProfileBtn: document.getElementById('setupProfileBtn'),
            modelDownloadSection: document.getElementById('modelDownloadSection'),
            downloadableModels: document.getElementById('downloadableModels'),
            loadingState: document.getElementById('loadingState'),
            errorState: document.getElementById('errorState'),
            errorMessage: document.getElementById('errorMessage'),
            retryBtn: document.getElementById('retryBtn'),
            summarySection: document.getElementById('summarySection'),
            summaryLanguage: document.getElementById('summaryLanguage'),
            summaryLength: document.getElementById('summaryLength'),
            summaryText: document.getElementById('summaryText'),
            qaSection: document.getElementById('qaSection'),
            qaHistory: document.getElementById('qaHistory'),
            questionInput: document.getElementById('questionInput'),
            askBtn: document.getElementById('askBtn'),
            charCount: document.getElementById('charCount')
        };
    }

    attachEventListeners() {
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.setupProfileBtn.addEventListener('click', () => this.openSettings());
        this.elements.retryBtn.addEventListener('click', () => this.generateSummary());
        this.elements.askBtn.addEventListener('click', () => this.askQuestion());
        this.elements.questionInput.addEventListener('input', (e) => this.handleQuestionInput(e));
        this.elements.questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.elements.askBtn.disabled) {
                this.askQuestion();
            }
        });
    }

    async initialize() {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
            this.elements.pageTitle.textContent = this.truncateTitle(tab.title);

            // Check AI availability first
            await this.checkAIAvailability();

            // Load user profile
            await this.loadUserProfile();

            // Check if profile is set up
            if (!this.userProfile) {
                this.showProfileSetup();
                return;
            }

            // Extract page content and generate summary
            await this.extractPageContent();
            await this.generateSummary();

        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize WebBriefer. Please try again.');
        }
    }

    async checkAIAvailability() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'checkAIAvailability' });
            console.log('AI Availability:', response);
            
            if (response.success) {
                // Store the AI capabilities for use by other methods
                this.aiCapabilities = response.availability;
                const { languageModel, summarizer, translator } = response.availability;
                
                // Check for downloadable models
                const downloadableModels = [];
                if (summarizer === 'downloadable') {
                    downloadableModels.push({
                        type: 'summarizer',
                        name: 'Summarizer Model',
                        description: 'AI model for generating content summaries'
                    });
                }
                if (translator === 'downloadable') {
                    downloadableModels.push({
                        type: 'translator',
                        name: 'Translator Model',
                        description: 'AI model for text translation'
                    });
                }
                if (languageModel === 'downloadable') {
                    downloadableModels.push({
                        type: 'languageModel',
                        name: 'Language Model',
                        description: 'AI model for Q&A and text generation'
                    });
                }
                
                // Show download section if there are downloadable models
                if (downloadableModels.length > 0) {
                    this.showModelDownloadSection(downloadableModels);
                    return; // Don't proceed with normal flow until models are downloaded
                }
                
                // Show appropriate status banners
                if (languageModel === 'available' && summarizer === 'available' && translator === 'available') {
                    this.showAIStatusBanner('success', '✅', 'All AI features are available');
                } else if (languageModel === 'unavailable' && summarizer === 'unavailable' && translator === 'unavailable') {
                    this.showAIUnavailableWarning();
                } else {
                    // Mixed availability
                    const available = [];
                    const unavailable = [];
                    
                    if (languageModel === 'available') available.push('Language Model');
                    else unavailable.push('Language Model');
                    
                    if (summarizer === 'available') available.push('Summarizer');
                    else unavailable.push('Summarizer');
                    
                    if (translator === 'available') available.push('Translator');
                    else unavailable.push('Translator');
                    
                    if (available.length > 0) {
                        this.showAIStatusBanner('info', 'ℹ️', `Available: ${available.join(', ')}`);
                    }
                    if (unavailable.length > 0) {
                        this.showAIStatusBanner('warning', '⚠️', `Limited: ${unavailable.join(', ')} unavailable`);
                    }
                }
            } else {
                this.showAIUnavailableWarning();
            }
        } catch (error) {
            console.error('Error checking AI availability:', error);
            this.showAIUnavailableWarning();
        }
    }

    showAIStatusMessage() {
        const { summarizer, languageModel, summarizerStatus, translatorStatus } = this.aiCapabilities;
        
        // If summarizer is available and ready, show success (fade after 3 seconds)
        if (summarizer && summarizerStatus === 'ready') {
            this.showAIStatusBanner('success', '✅', 'AI-powered summaries enabled', false);
            return;
        }
        
        // If summarizer is available but downloadable, show info (fade after 3 seconds)
        if (summarizer && summarizerStatus === 'downloadable') {
            this.showAIStatusBanner('info', '📥', 'AI model will download automatically on first use', false);
            return;
        }
        
        // If no AI capabilities are available, show warning
        if (!summarizer && !languageModel) {
            this.showAIUnavailableWarning();
            return;
        }
        
        // If language model is unavailable but other features exist, show persistent warning
        if (!languageModel) {
            this.showAIStatusBanner('warning', '⚠️', 'Limited: Language Model unavailable', true);
            return;
        }
        
        // If some capabilities are available, show partial availability (fade after 3 seconds)
        this.showAIStatusBanner('warning', '⚠️', 'Limited AI features available', false);
    }

    showAIStatusBanner(type, icon, message, persistent = false) {
        // Remove existing banners first
        const existingBanners = document.querySelectorAll('.ai-success-banner, .ai-info-banner, .ai-warning-banner');
        existingBanners.forEach(banner => banner.remove());
        
        const bannerClass = type === 'success' ? 'ai-success-banner' : 
                           type === 'info' ? 'ai-info-banner' : 'ai-warning-banner';
        
        const banner = document.createElement('div');
        banner.className = bannerClass;
        banner.innerHTML = `
            <div class="status-content">
                <span class="status-icon">${icon}</span>
                <span class="status-text">${message}</span>
            </div>
        `;
        
        // Insert after the header
        const header = document.querySelector('.header');
        header.insertAdjacentElement('afterend', banner);
        
        // Auto-fade non-persistent messages after 3 seconds
        if (!persistent) {
            setTimeout(() => {
                if (banner.parentNode) {
                    banner.style.transition = 'opacity 0.5s ease-out';
                    banner.style.opacity = '0';
                    setTimeout(() => {
                        if (banner.parentNode) {
                            banner.remove();
                        }
                    }, 500);
                }
            }, 3000);
        }
    }

    showAIUnavailableWarning() {
        this.showAIStatusBanner('warning', '⚠️', 'AI features unavailable. Basic summaries will be provided.');
    }

    showModelDownloadSection(downloadableModels) {
        this.hideAllStates();
        
        // Clear existing models
        this.elements.downloadableModels.innerHTML = '';
        
        // Add each downloadable model
        downloadableModels.forEach(model => {
            const modelElement = document.createElement('div');
            modelElement.className = 'model-item';
            modelElement.innerHTML = `
                <div class="model-info">
                    <h4>${model.name}</h4>
                    <p>${model.description}</p>
                </div>
                <button class="download-btn" data-model-type="${model.type}">
                    Download
                </button>
            `;
            
            // Add download event listener
            const downloadBtn = modelElement.querySelector('.download-btn');
            downloadBtn.addEventListener('click', () => this.downloadModel(model.type, downloadBtn));
            
            this.elements.downloadableModels.appendChild(modelElement);
        });
        
        this.elements.modelDownloadSection.classList.remove('hidden');
    }

    async downloadModel(modelType, buttonElement) {
        const originalText = buttonElement.textContent;
        buttonElement.textContent = 'Downloading...';
        buttonElement.disabled = true;
        
        try {
            // Check for user activation as required by Chrome AI APIs
            if (!navigator.userActivation || !navigator.userActivation.isActive) {
                throw new Error('User activation required to download AI models. Please click the button again.');
            }

            const response = await chrome.runtime.sendMessage({
                action: 'downloadModel',
                modelType: modelType
            });
            
            if (response.success) {
                buttonElement.textContent = 'Downloaded ✓';
                buttonElement.classList.add('downloaded');
                
                // Check if all models are downloaded
                const remainingDownloads = this.elements.downloadableModels.querySelectorAll('.download-btn:not(.downloaded)');
                if (remainingDownloads.length === 0) {
                    // All models downloaded, hide the setup section and proceed
                    setTimeout(() => {
                        this.elements.modelDownloadSection.classList.add('hidden');
                        this.continueInitialization();
                    }, 1000);
                }
            } else {
                throw new Error(response.error || 'Download failed');
            }
        } catch (error) {
            console.error('Model download error:', error);
            buttonElement.textContent = 'Download Failed';
            buttonElement.classList.add('error');
            
            // Re-enable after a delay
            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.disabled = false;
                buttonElement.classList.remove('error');
            }, 3000);
        }
    }

    async continueInitialization() {
        // Re-check AI availability - this will show download section if more models are needed
        await this.checkAIAvailability();
        
        // Continue with normal flow only if no more downloads are needed
        // checkAIAvailability() will show the download section if models are still downloadable
        if (this.elements.modelDownloadSection.classList.contains('hidden')) {
            await this.extractPageContent();
            await this.generateSummary();
        }
    }

    async loadUserProfile() {
        try {
            const result = await chrome.storage.local.get(['userProfile']);
            this.userProfile = result.userProfile || null;
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    showProfileSetup() {
        this.hideAllStates();
        this.elements.profileSetup.classList.remove('hidden');
    }

    async extractPageContent() {
        try {
            console.log('Attempting to extract content from tab:', this.currentTab.id, this.currentTab.url);
            
            // Check if the page supports content scripts
            if (!this.isContentScriptSupported(this.currentTab.url)) {
                throw new Error('Content scripts not supported on this page type');
            }

            // Try to inject content script if not already present
            await this.ensureContentScriptInjected();
            
            // Send message to content script to extract page content with retry
            const response = await this.sendMessageWithRetry(this.currentTab.id, {
                action: 'extractContent'
            });

            console.log('Content extraction response:', response);

            if (response && response.success) {
                this.pageContent = response.content;
                console.log('Content extraction successful, content:', this.pageContent);
            } else {
                const errorMsg = response?.error || 'Failed to extract page content';
                console.error('Content extraction failed:', errorMsg);
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('Content extraction error:', error);
            
            // Show user-friendly error status
            this.showContentExtractionStatus(this.currentTab.url, error);
            
            // Provide specific error messages based on error type
            let fallbackMessage = `Content extraction failed for ${this.currentTab.title}.`;
            if (error.message.includes('Could not establish connection')) {
                fallbackMessage += ' Content script not available. Please refresh the page and try again.';
            } else if (error.message.includes('not supported')) {
                fallbackMessage += ' This page type is not supported for content extraction.';
            } else {
                fallbackMessage += ' Please try refreshing the page.';
            }
            
            // Fallback: use basic tab info with proper structure
            this.pageContent = {
                title: this.currentTab.title,
                url: this.currentTab.url,
                text: {
                    raw: fallbackMessage,
                    paragraphs: [],
                    headings: [],
                    lists: [],
                    quotes: [],
                    links: [],
                    wordCount: 0,
                    readingTime: 0
                },
                images: [],
                metadata: {},
                structure: {},
                readability: {}
            };
        }
    }

    isContentScriptSupported(url) {
        // Check if the URL supports content script injection
        const unsupportedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'about:'];
        const unsupportedDomains = ['chrome.google.com/webstore'];
        
        // Check protocol
        for (const protocol of unsupportedProtocols) {
            if (url.startsWith(protocol)) {
                return false;
            }
        }
        
        // Check specific domains
        for (const domain of unsupportedDomains) {
            if (url.includes(domain)) {
                return false;
            }
        }
        
        return true;
    }

    async ensureContentScriptInjected() {
        try {
            // Try to ping the content script first
            await chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' });
        } catch (error) {
            // Content script not present, try to inject it
            console.log('Content script not found, attempting injection...');
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: this.currentTab.id },
                    files: ['content.js']
                });
                
                // Wait a bit for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (injectionError) {
                console.error('Failed to inject content script:', injectionError);
                throw new Error('Could not inject content script on this page');
            }
        }
    }

    async sendMessageWithRetry(tabId, message, maxRetries = 3, delay = 200) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await chrome.tabs.sendMessage(tabId, message);
                return response;
            } catch (error) {
                console.log(`Message attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }

    async generateSummary() {
        this.showLoading();

        try {
            // Send request to background script for AI processing
            const response = await chrome.runtime.sendMessage({
                action: 'generateSummary',
                data: {
                    pageContent: this.pageContent,
                    userProfile: this.userProfile
                }
            });

            if (response && response.success) {
                this.currentSummary = response.summary;
                this.displaySummary(response.summary);
                this.showQASection();
            } else if (response && response.errorCode === 'MODELS_DOWNLOADABLE') {
                // Models need to be downloaded - show download UI
                this.hideAllStates();
                const downloadableModels = response.downloadableModels.map(modelType => {
                    const modelNames = {
                        'summarizer': 'Summarizer Model',
                        'languageModel': 'Language Model',
                        'translator': 'Translator Model'
                    };
                    return {
                        type: modelType,
                        name: modelNames[modelType] || modelType
                    };
                });
                this.showModelDownloadSection(downloadableModels);
            } else {
                throw new Error(response.error || 'Failed to generate summary');
            }

        } catch (error) {
            console.error('Summary generation error:', error);
            this.showError(error.message || 'Failed to generate summary. Please try again.');
        }
    }

    async askQuestion() {
        const question = this.elements.questionInput.value.trim();
        if (!question) return;

        // Disable input while processing
        this.elements.askBtn.disabled = true;
        this.elements.questionInput.disabled = true;

        try {
            // Add question to history immediately
            this.addQuestionToHistory(question, 'Thinking...');

            // Send request to background script
            const response = await chrome.runtime.sendMessage({
                action: 'answerQuestion',
                data: {
                    question: question,
                    summary: this.currentSummary,
                    pageContent: this.pageContent,
                    userProfile: this.userProfile
                }
            });

            if (response && response.success) {
                // Update the answer in history
                this.updateLastAnswer(response.answer);
                this.qaHistory.push({
                    question: question,
                    answer: response.answer,
                    timestamp: new Date().toISOString()
                });
            } else {
                this.updateLastAnswer('Sorry, I couldn\'t process your question. Please try again.');
            }

        } catch (error) {
            console.error('Question answering error:', error);
            this.updateLastAnswer('An error occurred while processing your question.');
        } finally {
            // Re-enable input
            this.elements.questionInput.value = '';
            this.elements.questionInput.disabled = false;
            this.elements.askBtn.disabled = true;
            this.updateCharCount();
        }
    }

    displaySummary(summary) {
        this.hideAllStates();
        
        // Use translated summary if available, otherwise use original
        const summaryText = summary.translated || summary.original;
        
        // Format the summary text with proper paragraphs and highlights
        const formattedText = this.formatSummaryText(summaryText);
        this.elements.summaryText.innerHTML = formattedText;
        
        this.elements.summaryLanguage.textContent = this.getLanguageName(summary.language);
        this.elements.summaryLength.textContent = `~${summary.wordCount || this.countWords(summaryText)} words`;
        
        this.elements.summarySection.classList.remove('hidden');
    }

    showQASection() {
        this.elements.qaSection.classList.remove('hidden');
    }

    addQuestionToHistory(question, answer) {
        const qaItem = document.createElement('div');
        qaItem.className = 'qa-item';
        qaItem.innerHTML = `
            <div class="question">
                <div class="qa-label">Q:</div>
                <div class="qa-text">${this.escapeHtml(question)}</div>
            </div>
            <div class="answer">
                <div class="qa-label">A:</div>
                <div class="qa-text answer-text">${this.escapeHtml(answer)}</div>
            </div>
        `;
        
        this.elements.qaHistory.appendChild(qaItem);
        this.elements.qaHistory.scrollTop = this.elements.qaHistory.scrollHeight;
    }

    updateLastAnswer(answer) {
        const lastAnswer = this.elements.qaHistory.querySelector('.qa-item:last-child .answer-text');
        if (lastAnswer) {
            lastAnswer.textContent = answer;
        }
    }

    showLoading() {
        this.hideAllStates();
        this.elements.loadingState.classList.remove('hidden');
    }

    showError(message, type = 'error') {
        const errorDiv = document.createElement('div');
        errorDiv.className = `message ${type}-message`;
        
        // Create icon based on type
        const icon = document.createElement('span');
        icon.className = 'message-icon';
        if (type === 'warning') {
            icon.textContent = '⚠️';
        } else if (type === 'info') {
            icon.textContent = 'ℹ️';
        } else {
            icon.textContent = '❌';
        }
        
        const text = document.createElement('span');
        text.textContent = message;
        
        errorDiv.appendChild(icon);
        errorDiv.appendChild(text);
        
        // Insert error message at the top of the popup
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, container.firstChild);
        
        // Auto-remove after 7 seconds for better readability
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 7000);
        
        // Also show the original error state for fallback
        this.hideAllStates();
        this.elements.errorMessage.textContent = message;
        this.elements.errorState.classList.remove('hidden');
    }

    showContentExtractionStatus(url, error = null) {
        if (error) {
            let message = 'Content extraction failed.';
            let type = 'error';
            
            if (error.message.includes('not supported')) {
                message = 'This page type doesn\'t support content extraction.';
                type = 'info';
            } else if (error.message.includes('Could not establish connection')) {
                message = 'Content script unavailable. Try refreshing the page.';
                type = 'warning';
            } else if (url.startsWith('chrome:') || url.startsWith('chrome-extension:')) {
                message = 'Chrome internal pages cannot be processed.';
                type = 'info';
            }
            
            this.showError(message, type);
        }
    }

    hideAllStates() {
        this.elements.profileSetup.classList.add('hidden');
        this.elements.modelDownloadSection.classList.add('hidden');
        this.elements.loadingState.classList.add('hidden');
        this.elements.errorState.classList.add('hidden');
        this.elements.summarySection.classList.add('hidden');
        this.elements.qaSection.classList.add('hidden');
    }

    handleQuestionInput(e) {
        const value = e.target.value.trim();
        this.elements.askBtn.disabled = value.length === 0;
        this.updateCharCount();
    }

    updateCharCount() {
        const length = this.elements.questionInput.value.length;
        this.elements.charCount.textContent = `${length}/200`;
    }

    openSettings() {
        chrome.runtime.openOptionsPage();
    }

    truncateTitle(title, maxLength = 40) {
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength - 3) + '...';
    }

    getLanguageName(code) {
        const languages = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'hi': 'Hindi'
        };
        return languages[code] || 'Unknown';
    }

    countWords(text) {
        if (!text || typeof text !== 'string') {
            return 0;
        }
        
        // Remove asterisks and other formatting characters, then split by whitespace
        const cleanText = text.replace(/[*•\-]/g, ' ').trim();
        
        // Split by whitespace and filter out empty strings and pure punctuation
        const words = cleanText.split(/\s+/).filter(word => {
            // Remove punctuation and check if there's actual content
            const cleanWord = word.replace(/[^\w]/g, '');
            return cleanWord.length > 0;
        });
        
        return words.length;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatSummaryText(text) {
        if (!text) return '';
        
        // Don't escape HTML here - we'll handle it more carefully
        let formattedText = text;
        
        // Check if the text contains bullet points (starts with asterisks)
        const hasBulletPoints = /^\s*\*/.test(formattedText);
        
        if (hasBulletPoints) {
            // Handle bullet point format
            const bulletPoints = formattedText
                .split('*')  // Split by asterisk only
                .filter(point => point.trim())
                .map(point => point.trim());
            
            // Remove the leading asterisk from the first item if it exists
            if (bulletPoints[0] && bulletPoints[0].startsWith('*')) {
                bulletPoints[0] = bulletPoints[0].substring(1).trim();
            }
            console.log('Bullet points:', bulletPoints);
            return bulletPoints.map(point => {
                // First escape HTML entities in the text
                let escapedPoint = this.escapeHtml(point);
                
                // Then apply highlighting to the escaped text
                let highlightedPoint = escapedPoint
                    // Highlight numbers and percentages (more specific pattern)
                    .replace(/\b(\d+(?:,\d{3})*(?:\.\d+)?%?)\b/g, '<span class="highlight-number">$1</span>')
                    // Highlight dollar amounts
                    .replace(/\$(\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:trillion|billion|million|thousand))?)/gi, '<span class="highlight-number">$$$1</span>')
                    // Highlight quoted text
                    .replace(/&quot;([^&]+)&quot;/g, '<span class="highlight-quote">"$1"</span>')
                    // Highlight names (capitalized words that appear to be proper nouns)
                    .replace(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g, '<span class="highlight-name">$1</span>')

                return `<div class="bullet-point">${highlightedPoint}</div>`;
            }).join('');
        } else {
            // Handle regular paragraph format
            // Split into sentences and group into paragraphs
            const sentences = formattedText.split(/(?<=[.!?])\s+/);
            let paragraphs = [];
            let currentParagraph = [];
            
            sentences.forEach((sentence, index) => {
                currentParagraph.push(sentence.trim());
                
                // Create a new paragraph every 2-3 sentences
                if (currentParagraph.length >= 3 || (index === sentences.length - 1)) {
                    if (currentParagraph.length > 0) {
                        paragraphs.push(currentParagraph.join(' '));
                        currentParagraph = [];
                    }
                }
            });
            
            // Format each paragraph
            const formattedParagraphs = paragraphs.map(paragraph => {
                // First escape HTML entities in the text
                let escapedParagraph = this.escapeHtml(paragraph);
                
                // Then highlight key phrases and important information
                let highlightedParagraph = escapedParagraph
                    // Highlight numbers and percentages (more specific pattern)
                    .replace(/\b(\d+(?:,\d{3})*(?:\.\d+)?%?)\b/g, '<span class="highlight-number">$1</span>')
                    // Highlight dollar amounts
                    .replace(/\$(\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:trillion|billion|million|thousand))?)/gi, '<span class="highlight-number">$$$1</span>')
                    // Highlight quoted text
                    .replace(/&quot;([^&]+)&quot;/g, '<span class="highlight-quote">"$1"</span>')
                    // Highlight names (capitalized words that appear to be proper nouns)
                    .replace(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g, '<span class="highlight-name">$1</span>')
                
                return `<p class="summary-paragraph">${highlightedParagraph}</p>`;
            });
            
            return formattedParagraphs.join('');
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WebBrieferPopup();
});