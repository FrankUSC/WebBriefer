// WebBriefer Background Service Worker
class WebBrieferBackground {
    constructor() {
        this.aiSessions = new Map();
        this.setupMessageHandlers();
        this.initializeAI();
    }

    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'generateSummary':
                    await this.handleGenerateSummary(request, sendResponse);
                    break;
                case 'translateText':
                    await this.handleTranslateText(request, sendResponse);
                    break;
                case 'answerQuestion':
                    await this.handleAnswerQuestion(request, sendResponse);
                    break;
                case 'checkAIAvailability':
                    await this.handleCheckAIAvailability(sendResponse);
                    break;
                case 'downloadModel':
                    await this.handleDownloadModel(request, sendResponse);
                    break;
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background message handling error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleInstallation(details) {
        if (details.reason === 'install') {
            // Set default settings on first install
            await chrome.storage.local.set({
                userProfile: {
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
                }
            });

            // Open options page for initial setup
            chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
        }
    }

    async initializeAI() {
        try {
            // Check if Chrome AI APIs are available using proper feature detection
            this.aiCapabilities = {
                languageModel: 'LanguageModel' in self,
                summarizer: 'Summarizer' in self,
                translator: 'Translator' in self
            };

            console.log('AI Capabilities (Feature Detection):', this.aiCapabilities);

            // Check actual availability for each API
            if (this.aiCapabilities.summarizer) {
                try {
                    const summarizerAvailability = await self.Summarizer.availability();
                    console.log('Summarizer availability:', summarizerAvailability);
                    this.aiCapabilities.summarizerStatus = summarizerAvailability;
                } catch (error) {
                    console.log('Summarizer availability check failed:', error);
                    this.aiCapabilities.summarizerStatus = 'unavailable';
                }
            }

            if (this.aiCapabilities.translator) {
                try {
                    // Check availability for a common language pair (English to Spanish)
                    // This is just to test if the Translator API is available
                    const translatorAvailability = await self.Translator.availability({
                        sourceLanguage: 'en',
                        targetLanguage: 'es'
                    });
                    console.log('Translator availability:', translatorAvailability);
                    this.aiCapabilities.translatorStatus = translatorAvailability;
                } catch (error) {
                    console.log('Translator availability check failed:', error);
                    this.aiCapabilities.translatorStatus = 'unavailable';
                }
            }

            if (this.aiCapabilities.languageModel) {
                try {
                    const languageModelAvailability = await LanguageModel.availability();
                    console.log('Language Model availability:', languageModelAvailability);
                    this.aiCapabilities.languageModelStatus = languageModelAvailability;
                } catch (error) {
                    console.log('Language Model availability check failed:', error);
                    this.aiCapabilities.languageModelStatus = 'unavailable';
                }
            }

            console.log('Final AI Capabilities:', this.aiCapabilities);
        } catch (error) {
            console.error('AI initialization error:', error);
            this.aiCapabilities = {
                languageModel: false,
                summarizer: false,
                translator: false,
                languageModelStatus: 'unavailable',
                summarizerStatus: 'unavailable',
                translatorStatus: 'unavailable'
            };
        }
    }

    async handleCheckAIAvailability(sendResponse) {
        try {
            // Use cached status if model was downloaded, otherwise check real availability
            const languageModelStatus = this.aiCapabilities.languageModelStatus === 'available' ? 'readily' : 
                                       await this.checkLanguageModelAvailability();
            const summarizerStatus = this.aiCapabilities.summarizerStatus === 'available' ? 'readily' : 
                                    await this.checkSummarizerAvailability();
            const translatorStatus = this.aiCapabilities.translatorStatus === 'available' ? 'readily' : 
                                    await this.checkTranslatorAvailability();

            const availability = {
                languageModel: languageModelStatus === 'readily' ? 'available' : 
                              languageModelStatus === 'after-download' ? 'downloadable' : 'unavailable',
                summarizer: summarizerStatus === 'readily' ? 'available' : 
                           summarizerStatus === 'after-download' ? 'downloadable' : 'unavailable',
                translator: translatorStatus === 'readily' ? 'available' : 
                           translatorStatus === 'after-download' ? 'downloadable' : 'unavailable'
            };

            // Also include capabilities for backward compatibility
            const capabilities = {
                languageModel: languageModelStatus === 'readily' || languageModelStatus === 'after-download',
                summarizer: summarizerStatus === 'readily' || summarizerStatus === 'after-download',
                translator: translatorStatus === 'readily' || translatorStatus === 'after-download',
                languageModelStatus: languageModelStatus,
                summarizerStatus: summarizerStatus === 'readily' ? 'ready' : 
                                summarizerStatus === 'after-download' ? 'downloadable' : 'unavailable',
                translatorStatus: translatorStatus === 'readily' ? 'ready' : 
                                translatorStatus === 'after-download' ? 'downloadable' : 'unavailable'
            };

            sendResponse({ success: true, availability, capabilities });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async checkLanguageModelAvailability() {
        try {
            if (!('LanguageModel' in self)) {
                return 'not-supported';
            }
            return await LanguageModel.availability();
        } catch (error) {
            return 'not-available';
        }
    }

    async checkSummarizerAvailability() {
        try {
            if (!('ai' in self) || !('summarizer' in self.ai)) {
                return 'not-supported';
            }
            return await self.ai.summarizer.capabilities();
        } catch (error) {
            return 'not-available';
        }
    }

    async checkTranslatorAvailability() {
        try {
            if (!('Translator' in self)) {
                return 'not-supported';
            }
            // Check availability for a common language pair (English to Spanish)
            const availability = await self.Translator.availability({
                sourceLanguage: 'en',
                targetLanguage: 'es'
            });
            return availability;
        } catch (error) {
            console.log('Translator availability check error:', error);
            return 'not-available';
        }
    }

    async downloadSummarizerModel() {
        try {
            if (!this.aiCapabilities.summarizer || this.aiCapabilities.summarizerStatus !== 'downloadable') {
                throw new Error('Summarizer model is not downloadable');
            }

            console.log('Starting Summarizer model download...');
            const summarizer = await self.Summarizer.create({
                type: 'key-points',
                format: 'markdown',
                length: 'medium',
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        console.log(`Summarizer download progress: ${Math.round(e.loaded * 100)}%`);
                        // Send progress update to popup if needed
                        chrome.runtime.sendMessage({
                            type: 'downloadProgress',
                            model: 'summarizer',
                            progress: Math.round(e.loaded * 100)
                        }).catch(() => {}); // Ignore errors if popup is closed
                    });
                }
            });
            
            // Update status after successful creation
            this.aiCapabilities.summarizerStatus = 'available';
            summarizer.destroy(); // Clean up the test instance
            console.log('Summarizer model downloaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to download Summarizer model:', error);
            throw error;
        }
    }

    async downloadTranslatorModel() {
        try {
            if (!this.aiCapabilities.translator || this.aiCapabilities.translatorStatus !== 'downloadable') {
                throw new Error('Translator model is not downloadable');
            }

            // User activation is handled by the popup that triggers this download

            console.log('Starting Translator model download...');
            const translator = await self.Translator.create({
                sourceLanguage: 'en',
                targetLanguage: 'es',
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        console.log(`Translator download progress: ${Math.round(e.loaded * 100)}%`);
                        // Send progress update to popup if needed
                        chrome.runtime.sendMessage({
                            type: 'downloadProgress',
                            model: 'translator',
                            progress: Math.round(e.loaded * 100)
                        }).catch(() => {}); // Ignore errors if popup is closed
                    });
                }
            });
            
            // Update status after successful creation
            this.aiCapabilities.translatorStatus = 'available';
            translator.destroy(); // Clean up the test instance
            console.log('Translator model downloaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to download Translator model:', error);
            throw error;
        }
    }

    async downloadLanguageModel() {
        try {
            if (!this.aiCapabilities.languageModel || this.aiCapabilities.languageModelStatus !== 'downloadable') {
                throw new Error('Language model is not downloadable');
            }

            // User activation is handled by the popup that triggers this download

            console.log('Starting Language Model download...');
            const session = await LanguageModel.create({
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        console.log(`Language Model download progress: ${Math.round(e.loaded * 100)}%`);
                        // Send progress update to popup if needed
                        chrome.runtime.sendMessage({
                            type: 'downloadProgress',
                            model: 'languageModel',
                            progress: Math.round(e.loaded * 100)
                        }).catch(() => {}); // Ignore errors if popup is closed
                    });
                }
            });
            
            // Update status after successful creation
            this.aiCapabilities.languageModelStatus = 'available';
            session.destroy(); // Clean up the test instance
            console.log('Language Model downloaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to download Language Model:', error);
            throw error;
        }
    }

    async handleDownloadModel(request, sendResponse) {
        try {
            const { modelType } = request;
            
            if (!modelType) {
                throw new Error('Model type is required');
            }

            let result;
            switch (modelType) {
                case 'summarizer':
                    result = await this.downloadSummarizerModel();
                    break;
                case 'translator':
                    result = await this.downloadTranslatorModel();
                    break;
                case 'languageModel':
                    result = await this.downloadLanguageModel();
                    break;
                default:
                    throw new Error(`Unknown model type: ${modelType}`);
            }

            sendResponse({ success: true, downloaded: result });
        } catch (error) {
            console.error('Model download error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleGenerateSummary(request, sendResponse) {
        try {
            console.log("request is ", request);
            const { pageContent, userProfile } = request.data || request;
            const content = pageContent;
            
            // Enhanced validation with detailed error messages
            if (!content) {
                console.error('No content object provided');
                throw new Error('No content provided for summary generation');
            }
            
            if (!content.text) {
                console.error('Content object missing text property:', content);
                throw new Error('Content text is missing. Please try refreshing the page.');
            }
            
            if (!content.text.raw) {
                console.error('Content text missing raw property:', content.text);
                throw new Error('Content text data is incomplete. Please try refreshing the page.');
            }
            
            if (typeof content.text.raw !== 'string' || content.text.raw.trim().length === 0) {
                console.error('Content text raw is empty or invalid:', content.text.raw);
                throw new Error('No readable content found on this page. Please try a different page.');
            }

            // Check if AI capabilities are available
            if (!this.aiCapabilities.summarizer && !this.aiCapabilities.languageModel) {
                sendResponse({
                    success: false,
                    error: 'AI summarization is not available in this browser'
                });
                return;
            }

            // Check if models need to be downloaded
            const downloadableModels = [];
            if (this.aiCapabilities.summarizer && this.aiCapabilities.summarizerStatus === 'downloadable') {
                downloadableModels.push('summarizer');
            }
            if (this.aiCapabilities.languageModel && this.aiCapabilities.languageModelStatus === 'downloadable') {
                downloadableModels.push('languageModel');
            }
            if (this.aiCapabilities.translator && this.aiCapabilities.translatorStatus === 'downloadable') {
                downloadableModels.push('translator');
            }

            if (downloadableModels.length > 0) {
                sendResponse({
                    success: false,
                    error: 'Models need to be downloaded',
                    errorCode: 'MODELS_DOWNLOADABLE',
                    downloadableModels: downloadableModels
                });
                return;
            }

            // Generate personalized summary
            const summary = await this.generatePersonalizedSummary(content, userProfile);
            console.log("summary is ", summary);
            // Translate if needed
            let translatedSummary = summary;
            if (userProfile.preferredLanguage !== 'en') {
                translatedSummary = await this.translateSummary(summary, userProfile.preferredLanguage);
            }

            sendResponse({
                success: true,
                summary: {
                    original: summary,
                    translated: translatedSummary,
                    language: userProfile.preferredLanguage,
                    wordCount: this.countWords(summary), // Always count words from original English summary
                    generatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Summary generation error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async generatePersonalizedSummary(content, userProfile) {
        try {
            console.log("generatePersonalizedSummary, content is ", content);
            // Create personalized prompt based on user profile
            const prompt = this.createSummaryPrompt(content, userProfile);
            
            // Try Chrome's Summarizer API first
            if (this.aiCapabilities.summarizer && this.aiCapabilities.summarizerStatus === 'available') {
                try {
                    const summarizer = await self.Summarizer.create({
                        type: 'key-points',
                        format: 'markdown',
                        length: 'medium',
                        monitor(m) {
                            m.addEventListener('downloadprogress', (e) => {
                                console.log(`Summarizer download progress: ${Math.round(e.loaded * 100)}%`);
                            });
                        }
                    });
                    
                    const textContent = content.text?.raw || content.text || '';
                    const summary = await summarizer.summarize(textContent);
                    summarizer.destroy();
                    
                    return this.enhanceSummaryWithProfile(summary, userProfile);
                } catch (summarizerError) {
                    console.warn('Summarizer API failed, falling back to Language Model:', summarizerError);
                }
            }

            // Fallback to Language Model API
            if (this.aiCapabilities.languageModel && this.aiCapabilities.languageModelStatus === 'available') {
                const session = await this.getOrCreateLanguageModelSession();
                const response = await session.prompt(prompt);
                return response;
            }

            // Final fallback to basic text processing
            return this.generateBasicSummary(content, userProfile);

        } catch (error) {
            console.error('Personalized summary generation error:', error);
            throw new Error('Failed to generate summary: ' + error.message);
        }
    }

    createSummaryPrompt(content, userProfile) {
        const ageGroup = this.getAgeGroup(userProfile.age);
        const focusAreas = this.getFocusAreas(userProfile.contentFocus);
        
        // Safely extract text content with fallback
        const textContent = content.text?.raw || content.text || '';
        const truncatedText = textContent.length > 4000 ? textContent.substring(0, 4000) + '...' : textContent;
        
        return `
You are an AI assistant helping to create personalized content summaries. Please create a summary of the following webpage content:

User Profile:
- Age: ${userProfile.age} (${ageGroup})
- Occupation: ${userProfile.occupation}
- Education: ${userProfile.education}
- Summary Style: ${userProfile.summaryStyle}
- Focus Areas: ${focusAreas}

Content to Summarize:
Title: ${content.title || 'No title available'}
URL: ${content.url || 'No URL available'}
Text: ${truncatedText}

Instructions:
1. Create a summary in less than 500 words
2. Adapt the language complexity for a ${ageGroup} with ${userProfile.education} education
3. Focus on ${focusAreas} as requested by the user
4. Use a ${userProfile.summaryStyle} tone
5. Structure the summary with clear headings and bullet points
6. Include the most relevant information for someone in ${userProfile.occupation}
7. Write in English (translation will be handled separately if needed)
8. Include titles, major topic about the page, and key points,
9. Include what is this 
8. Make sure the user with the following profile can fully understand the summary:
- Age: ${userProfile.age} (${ageGroup})
- Occupation: ${userProfile.occupation}
- Education: ${userProfile.education}
- Summary Style: ${userProfile.summaryStyle}
- Focus Areas: ${focusAreas}

Please provide a well-structured, personalized summary that would be most valuable for this specific user profile.
        `.trim();
    }

    getAgeGroup(age) {
        if (age < 18) return 'teenager';
        if (age < 25) return 'young adult';
        if (age < 35) return 'adult';
        if (age < 50) return 'middle-aged adult';
        return 'mature adult';
    }

    getFocusAreas(contentFocus) {
        const areas = [];
        if (contentFocus.keyPoints) areas.push('key points');
        if (contentFocus.numbers) areas.push('statistics and numbers');
        if (contentFocus.quotes) areas.push('important quotes');
        if (contentFocus.actions) areas.push('actionable insights');
        
        return areas.length > 0 ? areas.join(', ') : 'general overview';
    }

    enhanceSummaryWithProfile(summary, userProfile) {
        // Add profile-specific enhancements to the summary
        let enhanced = summary;
        
        // Add context for occupation if relevant
        if (userProfile.occupation) {
            enhanced += `\n\n**Relevance for ${userProfile.occupation}:** This content may be particularly relevant for your professional context.`;
        }
        
        return summary;
    }

    generateBasicSummary(content, userProfile) {
        // Basic fallback summary generation
        const paragraphs = content.text.paragraphs || [];
        const headings = content.text.headings || [];
        
        let summary = `# Summary of ${content.title}\n\n`;
        
        if (headings.length > 0) {
            summary += '## Key Topics:\n';
            headings.slice(0, 5).forEach(heading => {
                summary += `- ${heading.text}\n`;
            });
            summary += '\n';
        }
        
        if (paragraphs.length > 0) {
            summary += '## Main Points:\n';
            paragraphs.slice(0, 3).forEach(paragraph => {
                const shortened = paragraph.length > 200 ? paragraph.substring(0, 200) + '...' : paragraph;
                summary += `${shortened}\n\n`;
            });
        }
        
        summary += `\n**Reading Time:** ${content.text.readingTime} minutes\n`;
        summary += `**Word Count:** ${content.text.wordCount} words`;
        
        return summary;
    }

    async getOrCreateLanguageModelSession() {
        const sessionId = 'main';
        
        if (!this.aiSessions.has(sessionId)) {
            try {
                // Check if model needs to be downloaded and user activation is required
                if (this.aiCapabilities.languageModelStatus === 'downloadable') {
                    throw new Error('Model download required - user activation needed');
                }
                
                const session = await LanguageModel.create({
                    initialPrompts: [{
                        role: 'system',
                        content: 'You are a helpful AI assistant that creates personalized content summaries. Always provide accurate, well-structured, and relevant information adapted to the user\'s profile and preferences.'
                    }],
                    monitor(m) {
                        m.addEventListener('downloadprogress', (e) => {
                            console.log(`Language Model download progress: ${Math.round(e.loaded * 100)}%`);
                        });
                    }
                });
                this.aiSessions.set(sessionId, session);
            } catch (error) {
                throw new Error('Failed to create language model session: ' + error.message);
            }
        }
        
        return this.aiSessions.get(sessionId);
    }

    async handleTranslateText(request, sendResponse) {
        try {
            const { text, targetLanguage } = request;
            
            if (!text || !targetLanguage) {
                throw new Error('Text and target language are required for translation');
            }

            // Check if translator model is downloadable and needs user activation
            if (this.aiCapabilities.translator && this.aiCapabilities.translatorStatus === 'downloadable') {
                sendResponse({ 
                    success: false, 
                    error: 'Translator model needs to be downloaded first',
                    errorCode: 'MODEL_DOWNLOAD_REQUIRED',
                    modelType: 'translator'
                });
                return;
            }

            // Check if language model is downloadable and translator is not available
            if (!this.aiCapabilities.translator && 
                this.aiCapabilities.languageModel && 
                this.aiCapabilities.languageModelStatus === 'downloadable') {
                sendResponse({ 
                    success: false, 
                    error: 'Language model needs to be downloaded first for translation',
                    errorCode: 'MODEL_DOWNLOAD_REQUIRED',
                    modelType: 'languageModel'
                });
                return;
            }

            const translatedText = await this.translateText(text, targetLanguage);
            
            sendResponse({
                success: true,
                translatedText,
                originalLanguage: 'en',
                targetLanguage
            });

        } catch (error) {
            console.error('Translation error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async translateText(text, targetLanguage) {
        try {
            // Try Chrome's Translator API first - only if available (not downloadable)
            if (this.aiCapabilities.translator && this.aiCapabilities.translatorStatus === 'available') {
                try {
                    const translator = await self.Translator.create({
                        sourceLanguage: 'en',
                        targetLanguage: targetLanguage,
                        monitor(m) {
                            m.addEventListener('downloadprogress', (e) => {
                                console.log(`Translator download progress: ${Math.round(e.loaded * 100)}%`);
                            });
                        }
                    });
                    
                    const translated = await translator.translate(text);
                    translator.destroy();
                    
                    return translated;
                } catch (translatorError) {
                    console.warn('Translator API failed, falling back to Language Model:', translatorError);
                }
            }

            // Fallback to Language Model for translation - only if available
            if (this.aiCapabilities.languageModel && this.aiCapabilities.languageModelStatus === 'available') {
                const session = await this.getOrCreateLanguageModelSession();
                const prompt = `Please translate the following text from English to ${this.getLanguageName(targetLanguage)}. Only provide the translation, no additional text:\n\n${text}`;
                return await session.prompt(prompt);
            }

            // If no AI available, return original text
            return text;

        } catch (error) {
            console.error('Translation error:', error);
            return text; // Return original text if translation fails
        }
    }

    async translateSummary(summary, targetLanguage) {
        if (targetLanguage === 'en') {
            return summary;
        }
        
        return await this.translateText(summary, targetLanguage);
    }

    getLanguageName(code) {
        const languages = {
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
            'hi': 'Hindi',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'da': 'Danish',
            'no': 'Norwegian',
            'fi': 'Finnish',
            'pl': 'Polish',
            'tr': 'Turkish',
            'th': 'Thai',
            'vi': 'Vietnamese'
        };
        
        return languages[code] || code;
    }

    async handleAnswerQuestion(request, sendResponse) {
        try {
            const { question, summary, pageContent, userProfile } = request.data || request;
            const originalContent = pageContent;
            
            if (!question) {
                throw new Error('Question is required');
            }
            
            if (!summary) {
                throw new Error('Summary is required to answer questions. Please generate a summary first.');
            }

            const answer = await this.generateAnswer(question, summary, originalContent, userProfile);
            
            sendResponse({
                success: true,
                answer,
                question,
                generatedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Question answering error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async generateAnswer(question, summary, originalContent, userProfile) {
        try {
            const prompt = this.createAnswerPrompt(question, summary, originalContent, userProfile);
            
            if (this.aiCapabilities.languageModel) {
                const session = await this.getOrCreateLanguageModelSession();
                return await session.prompt(prompt);
            }

            // Fallback to basic answer generation
            return this.generateBasicAnswer(question, summary);

        } catch (error) {
            console.error('Answer generation error:', error);
            throw new Error('Failed to generate answer: ' + error.message);
        }
    }

    createAnswerPrompt(question, summary, originalContent, userProfile) {
        return `
You are answering a follow-up question about a webpage that has been summarized for a specific user.

User Profile:
- Age: ${userProfile.age}
- Occupation: ${userProfile.occupation}
- Education: ${userProfile.education}

Summary of the webpage:
${summary}

Original content context:
${originalContent?.text?.raw?.substring(0, 2000) || 'Not available'}...

User's Question: ${question}

Instructions:
1. Answer the question based on the summary and original content
2. Adapt your answer for someone with ${userProfile.education} education level
3. Keep the answer concise but informative (max 200 words)
4. If the information isn't available in the content, say so clearly
5. Relate the answer to the user's occupation (${userProfile.occupation}) if relevant
6. Use a helpful and professional tone

Please provide a clear, accurate answer to the user's question.
        `.trim();
    }

    generateBasicAnswer(question, summary) {
        // Validate inputs
        if (!question || typeof question !== 'string') {
            return "I need a valid question to provide an answer.";
        }
        
        if (!summary || typeof summary !== 'string') {
            return "I don't have a summary available to answer your question. Please try generating a summary first.";
        }
        
        // Basic fallback answer generation
        const lowerQuestion = question.toLowerCase();
        const lowerSummary = summary.toLowerCase();
        
        if (lowerQuestion.includes('what') || lowerQuestion.includes('who') || 
            lowerQuestion.includes('when') || lowerQuestion.includes('where') || 
            lowerQuestion.includes('how') || lowerQuestion.includes('why')) {
            
            // Try to find relevant sentences in the summary
            const sentences = summary.split(/[.!?]+/);
            const relevantSentences = sentences.filter(sentence => {
                const lowerSentence = sentence.toLowerCase();
                return question.split(' ').some(word => 
                    word.length > 3 && lowerSentence.includes(word.toLowerCase())
                );
            });
            
            if (relevantSentences.length > 0) {
                return relevantSentences.slice(0, 2).join('. ') + '.';
            }
        }
        
        return "I don't have enough information in the summary to answer that specific question. You might want to read the full article for more details.";
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

    // Cleanup method for when the service worker is terminated
    cleanup() {
        this.aiSessions.forEach(session => {
            try {
                session.destroy();
            } catch (error) {
                console.error('Error destroying AI session:', error);
            }
        });
        this.aiSessions.clear();
    }
}

// Initialize the background service worker
const webBrieferBackground = new WebBrieferBackground();

// Handle service worker termination
self.addEventListener('beforeunload', () => {
    webBrieferBackground.cleanup();
});