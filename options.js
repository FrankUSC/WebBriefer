// WebBriefer Options Script
class WebBrieferOptions {
    constructor() {
        this.defaultProfile = {
            age: 25,
            occupation: '',
            education: '',
            preferredLanguage: 'en',
            summaryStyle: 'balanced',
            contentFocus: {
                keyPoints: true,
                numbers: false,
                quotes: false,
                actions: false
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.initializeElements();
        this.attachEventListeners();
        this.loadProfile();
        this.checkAICapabilities();
    }

    initializeElements() {
        this.elements = {
            // Form elements
            profileForm: document.getElementById('profileForm'),
            ageSlider: document.getElementById('ageSlider'),
            ageInput: document.getElementById('age'),
            occupation: document.getElementById('occupation'),
            education: document.getElementById('education'),
            preferredLanguage: document.getElementById('preferredLanguage'),
            summaryStyle: document.getElementById('summaryStyle'),
            
            // Content focus checkboxes
            focusKeyPoints: document.getElementById('focusKeyPoints'),
            focusNumbers: document.getElementById('focusNumbers'),
            focusQuotes: document.getElementById('focusQuotes'),
            focusActions: document.getElementById('focusActions'),
            
            // Action buttons
            saveBtn: document.getElementById('saveBtn'),
            resetBtn: document.getElementById('resetBtn'),
            
            // Messages
            successMessage: document.getElementById('successMessage'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText'),
            
            // Links
            aboutLink: document.getElementById('aboutLink'),
            helpLink: document.getElementById('helpLink'),
            
            // AI Capabilities elements
            aiCapabilitiesContainer: document.getElementById('aiCapabilitiesContainer'),
            languageModelStatus: document.getElementById('languageModelStatus'),
            summarizerStatus: document.getElementById('summarizerStatus'),
            translatorStatus: document.getElementById('translatorStatus')
        };
    }

    attachEventListeners() {
        // Form submission
        this.elements.profileForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Age slider and input synchronization
        this.elements.ageSlider.addEventListener('input', (e) => {
            this.elements.ageInput.value = e.target.value;
        });
        
        this.elements.ageInput.addEventListener('input', (e) => {
            const value = Math.max(8, Math.min(100, parseInt(e.target.value) || 8));
            this.elements.ageInput.value = value;
            this.elements.ageSlider.value = value;
        });

        // Reset button
        this.elements.resetBtn.addEventListener('click', () => this.resetToDefaults());

        // Form validation
        this.elements.occupation.addEventListener('change', () => this.validateForm());
        this.elements.education.addEventListener('change', () => this.validateForm());
        this.elements.preferredLanguage.addEventListener('change', () => this.validateForm());

        // Footer links
        this.elements.aboutLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAbout();
        });

        this.elements.helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showHelp();
        });
    }

    async loadProfile() {
        try {
            const result = await chrome.storage.local.get(['userProfile']);
            const profile = result.userProfile || this.defaultProfile;
            
            this.populateForm(profile);
            this.validateForm();
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Failed to load your profile. Using default settings.');
        }
    }

    populateForm(profile) {
        // Basic information
        this.elements.ageSlider.value = profile.age || 25;
        this.elements.ageInput.value = profile.age || 25;
        this.elements.occupation.value = profile.occupation || '';
        this.elements.education.value = profile.education || '';
        this.elements.preferredLanguage.value = profile.preferredLanguage || 'en';
        this.elements.summaryStyle.value = profile.summaryStyle || 'balanced';

        // Content focus checkboxes
        const focus = profile.contentFocus || this.defaultProfile.contentFocus;
        this.elements.focusKeyPoints.checked = focus.keyPoints;
        this.elements.focusNumbers.checked = focus.numbers;
        this.elements.focusQuotes.checked = focus.quotes;
        this.elements.focusActions.checked = focus.actions;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            this.showError('Please fill in all required fields.');
            return;
        }

        try {
            this.elements.saveBtn.disabled = true;
            this.elements.saveBtn.textContent = 'Saving...';

            const profile = this.collectFormData();
            await this.saveProfile(profile);
            
            this.showSuccess();
            
        } catch (error) {
            console.error('Error saving profile:', error);
            this.showError('Failed to save your profile. Please try again.');
        } finally {
            this.elements.saveBtn.disabled = false;
            this.elements.saveBtn.textContent = 'Save Profile';
        }
    }

    collectFormData() {
        return {
            age: parseInt(this.elements.ageInput.value),
            occupation: this.elements.occupation.value,
            education: this.elements.education.value,
            preferredLanguage: this.elements.preferredLanguage.value,
            summaryStyle: this.elements.summaryStyle.value,
            contentFocus: {
                keyPoints: this.elements.focusKeyPoints.checked,
                numbers: this.elements.focusNumbers.checked,
                quotes: this.elements.focusQuotes.checked,
                actions: this.elements.focusActions.checked
            },
            updatedAt: new Date().toISOString(),
            createdAt: this.getCurrentProfile()?.createdAt || new Date().toISOString()
        };
    }

    async saveProfile(profile) {
        await chrome.storage.local.set({ userProfile: profile });
    }

    async getCurrentProfile() {
        try {
            const result = await chrome.storage.local.get(['userProfile']);
            return result.userProfile;
        } catch (error) {
            return null;
        }
    }

    validateForm() {
        const isValid = this.elements.occupation.value && 
                       this.elements.education.value && 
                       this.elements.preferredLanguage.value;
        
        this.elements.saveBtn.disabled = !isValid;
        return isValid;
    }

    resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
            this.populateForm(this.defaultProfile);
            this.validateForm();
        }
    }

    showSuccess() {
        this.hideMessages();
        this.elements.successMessage.classList.remove('hidden');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.elements.successMessage.classList.add('hidden');
        }, 3000);
    }

    showError(message) {
        this.hideMessages();
        this.elements.errorText.textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.elements.errorMessage.classList.add('hidden');
        }, 5000);
    }

    hideMessages() {
        this.elements.successMessage.classList.add('hidden');
        this.elements.errorMessage.classList.add('hidden');
    }

    showAbout() {
        const aboutText = `
WebBriefer v1.0.0

An intelligent Chrome extension that transforms complex web content into personalized, accessible summaries using Chrome's built-in AI capabilities.

Features:
• Personalized summaries based on your profile
• Multi-language support with automatic translation
• Interactive Q&A with webpage content
• Privacy-first design with local processing
• Powered by Gemini Nano and Chrome Built-in AI

Created for the Google Chrome Built-in AI Challenge 2025.

All processing happens locally on your device for maximum privacy and security.
        `;
        
        alert(aboutText);
    }

    showHelp() {
        const helpText = `
WebBriefer Help

Getting Started:
1. Fill out your profile information (age, occupation, education)
2. Choose your preferred language for summaries
3. Select your summary style preferences
4. Save your profile

Using WebBriefer:
1. Navigate to any webpage
2. Click the WebBriefer extension icon
3. Wait for your personalized summary to generate
4. Ask follow-up questions in the Q&A section

Tips:
• More accurate profile information leads to better summaries
• The extension works best on text-heavy pages like articles and blogs
• Your data never leaves your device - everything is processed locally

Troubleshooting:
• If summaries aren't generating, check that Chrome's AI features are enabled
• Make sure you're on a webpage with substantial text content
• Try refreshing the page and clicking the extension again

For more help, check the Chrome Web Store listing or GitHub repository.
        `;
        
        alert(helpText);
    }

    // AI Capabilities Detection
    async checkAICapabilities() {
        try {
            // Send message to background script to check AI capabilities
            const response = await chrome.runtime.sendMessage({ action: 'checkAIAvailability' });
            this.displayAICapabilities(response);
        } catch (error) {
            console.error('Error checking AI capabilities:', error);
            this.displayAICapabilitiesError();
        }
    }

    displayAICapabilities(capabilities) {
        // Update Language Model status
        this.updateCapabilityStatus(
            this.elements.languageModelStatus,
            capabilities.languageModel,
            capabilities.languageModelStatus,
            'Language Model'
        );

        // Update Summarizer status
        this.updateCapabilityStatus(
            this.elements.summarizerStatus,
            capabilities.summarizer,
            capabilities.summarizerStatus,
            'Summarizer'
        );

        // Update Translator status
        this.updateCapabilityStatus(
            this.elements.translatorStatus,
            capabilities.translator,
            capabilities.translatorStatus,
            'Translator'
        );
    }

    updateCapabilityStatus(statusElement, isAvailable, statusString, capabilityName) {
        const statusBadge = statusElement.querySelector('.status-badge');
        
        // Remove existing classes
        statusBadge.classList.remove('checking', 'available', 'downloadable', 'unavailable', 'error');
        
        if (isAvailable) {
            if (statusString === 'ready') {
                statusBadge.classList.add('available');
                statusBadge.textContent = 'Ready';
                statusBadge.title = `${capabilityName} is ready to use`;
            } else if (statusString === 'downloadable') {
                statusBadge.classList.add('downloadable');
                statusBadge.textContent = 'Downloadable';
                statusBadge.title = `${capabilityName} can be downloaded and used`;
            } else {
                statusBadge.classList.add('available');
                statusBadge.textContent = 'Available';
                statusBadge.title = `${capabilityName} is available`;
            }
        } else {
            statusBadge.classList.add('unavailable');
            statusBadge.textContent = 'Unavailable';
            statusBadge.title = `${capabilityName} is not available on this device`;
        }
    }

    displayAICapabilitiesError() {
        // Show error state for all capabilities
        const statusElements = [
            this.elements.languageModelStatus,
            this.elements.summarizerStatus,
            this.elements.translatorStatus
        ];

        statusElements.forEach(statusElement => {
            const statusBadge = statusElement.querySelector('.status-badge');
            statusBadge.classList.remove('checking', 'available', 'downloadable', 'unavailable');
            statusBadge.classList.add('error');
            statusBadge.textContent = 'Error';
            statusBadge.title = 'Unable to check AI capability status';
        });
    }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WebBrieferOptions();
});