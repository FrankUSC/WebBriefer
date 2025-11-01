// WebBriefer Content Script
class WebBrieferContentExtractor {
    constructor() {
        this.isProcessing = false;
        this.extractedContent = null;
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Content script received message:', request);
            
            if (request.action === 'ping') {
                // Simple ping response to check if content script is loaded
                sendResponse({ success: true, message: 'Content script is active' });
                return false;
            }
            
            if (request.action === 'extractContent') {
                console.log('Processing extractContent request');
                this.handleContentExtraction(sendResponse);
                return true; // Keep message channel open for async response
            }
        });
    }

    async handleContentExtraction(sendResponse) {
        if (this.isProcessing) {
            sendResponse({ 
                success: false, 
                error: 'Content extraction already in progress' 
            });
            return;
        }

        try {
            this.isProcessing = true;
            const content = await this.extractPageContent();
            
            sendResponse({ 
                success: true, 
                content: content 
            });
        } catch (error) {
            console.error('Content extraction error:', error);
            sendResponse({ 
                success: false, 
                error: error.message 
            });
        } finally {
            this.isProcessing = false;
        }
    }

    async extractPageContent() {
        const content = {
            url: window.location.href,
            title: document.title,
            domain: window.location.hostname,
            timestamp: new Date().toISOString(),
            text: this.extractTextContent(),
            images: this.extractImages(),
            metadata: this.extractMetadata(),
            structure: this.analyzePageStructure(),
            readability: this.calculateReadabilityMetrics()
        };

        return content;
    }

    extractTextContent() {
        // Remove unwanted elements
        const elementsToRemove = [
            'script', 'style', 'nav', 'header', 'footer', 
            'aside', '.advertisement', '.ads', '.sidebar',
            '.comments', '.social-share', '.popup', '.modal'
        ];

        const clone = document.cloneNode(true);
        elementsToRemove.forEach(selector => {
            const elements = clone.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });

        // Extract main content areas
        const contentSelectors = [
            'main', 'article', '[role="main"]', '.content', 
            '.post-content', '.entry-content', '.article-content',
            '.story-body', '.post-body', '.content-body'
        ];

        let mainContent = null;
        for (const selector of contentSelectors) {
            const element = clone.querySelector(selector);
            if (element) {
                mainContent = element;
                break;
            }
        }

        // Fallback to body if no main content found
        if (!mainContent) {
            mainContent = clone.querySelector('body');
        }

        const textContent = this.extractCleanText(mainContent);
        
        return {
            raw: textContent,
            paragraphs: this.extractParagraphs(mainContent),
            headings: this.extractHeadings(mainContent),
            lists: this.extractLists(mainContent),
            quotes: this.extractQuotes(mainContent),
            links: this.extractLinks(mainContent),
            wordCount: this.countWords(textContent),
            readingTime: this.estimateReadingTime(textContent)
        };
    }

    extractCleanText(element) {
        if (!element) return '';
        
        // Get text content and clean it up
        let text = element.textContent || element.innerText || '';
        
        // Remove extra whitespace and normalize
        text = text.replace(/\s+/g, ' ').trim();
        
        // Remove common noise patterns
        text = text.replace(/\b(Advertisement|Sponsored|Click here|Read more|Continue reading)\b/gi, '');
        
        return text;
    }

    extractParagraphs(element) {
        if (!element) return [];
        
        const paragraphs = Array.from(element.querySelectorAll('p'))
            .map(p => this.extractCleanText(p))
            .filter(text => text.length > 50) // Filter out short paragraphs
            .slice(0, 20); // Limit to first 20 paragraphs
        
        return paragraphs;
    }

    extractHeadings(element) {
        if (!element) return [];
        
        const headings = [];
        for (let i = 1; i <= 6; i++) {
            const headingElements = element.querySelectorAll(`h${i}`);
            headingElements.forEach(h => {
                const text = this.extractCleanText(h);
                if (text) {
                    headings.push({
                        level: i,
                        text: text,
                        id: h.id || null
                    });
                }
            });
        }
        
        return headings.slice(0, 10); // Limit to first 10 headings
    }

    extractLists(element) {
        if (!element) return [];
        
        const lists = [];
        const listElements = element.querySelectorAll('ul, ol');
        
        listElements.forEach((list, index) => {
            if (index >= 5) return; // Limit to first 5 lists
            
            const items = Array.from(list.querySelectorAll('li'))
                .map(li => this.extractCleanText(li))
                .filter(text => text.length > 0)
                .slice(0, 10); // Limit to first 10 items per list
            
            if (items.length > 0) {
                lists.push({
                    type: list.tagName.toLowerCase(),
                    items: items
                });
            }
        });
        
        return lists;
    }

    extractQuotes(element) {
        if (!element) return [];
        
        const quotes = [];
        const quoteElements = element.querySelectorAll('blockquote, q, .quote');
        
        quoteElements.forEach((quote, index) => {
            if (index >= 5) return; // Limit to first 5 quotes
            
            const text = this.extractCleanText(quote);
            if (text && text.length > 20) {
                quotes.push({
                    text: text,
                    author: this.extractQuoteAuthor(quote)
                });
            }
        });
        
        return quotes;
    }

    extractQuoteAuthor(quoteElement) {
        // Look for author in common patterns
        const authorSelectors = [
            '.author', '.attribution', 'cite', '.quote-author',
            '.byline', '.credit'
        ];
        
        for (const selector of authorSelectors) {
            const authorElement = quoteElement.querySelector(selector) || 
                                quoteElement.parentElement?.querySelector(selector);
            if (authorElement) {
                return this.extractCleanText(authorElement);
            }
        }
        
        return null;
    }

    extractLinks(element) {
        if (!element) return [];
        
        const links = [];
        const linkElements = element.querySelectorAll('a[href]');
        
        linkElements.forEach((link, index) => {
            if (index >= 20) return; // Limit to first 20 links
            
            const text = this.extractCleanText(link);
            const href = link.href;
            
            if (text && href && !href.startsWith('javascript:')) {
                links.push({
                    text: text,
                    url: href,
                    isExternal: !href.includes(window.location.hostname)
                });
            }
        });
        
        return links;
    }

    extractImages() {
        const images = [];
        const imageElements = document.querySelectorAll('img[src]');
        
        imageElements.forEach((img, index) => {
            if (index >= 10) return; // Limit to first 10 images
            
            const src = img.src;
            const alt = img.alt || '';
            const title = img.title || '';
            
            // Skip small images (likely icons or decorative)
            if (img.naturalWidth < 100 || img.naturalHeight < 100) {
                return;
            }
            
            // Skip common ad/tracking images
            if (src.includes('doubleclick') || src.includes('googleadservices') || 
                src.includes('facebook.com/tr') || src.includes('analytics')) {
                return;
            }
            
            images.push({
                src: src,
                alt: alt,
                title: title,
                width: img.naturalWidth,
                height: img.naturalHeight,
                aspectRatio: img.naturalWidth / img.naturalHeight
            });
        });
        
        return images;
    }

    extractMetadata() {
        const metadata = {
            description: this.getMetaContent('description'),
            keywords: this.getMetaContent('keywords'),
            author: this.getMetaContent('author'),
            publishDate: this.getMetaContent('article:published_time') || 
                        this.getMetaContent('pubdate'),
            modifiedDate: this.getMetaContent('article:modified_time'),
            ogTitle: this.getMetaContent('og:title'),
            ogDescription: this.getMetaContent('og:description'),
            ogImage: this.getMetaContent('og:image'),
            twitterTitle: this.getMetaContent('twitter:title'),
            twitterDescription: this.getMetaContent('twitter:description'),
            canonical: this.getCanonicalUrl(),
            language: document.documentElement.lang || 'en'
        };
        
        return metadata;
    }

    getMetaContent(name) {
        const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return meta ? meta.content : null;
    }

    getCanonicalUrl() {
        const canonical = document.querySelector('link[rel="canonical"]');
        return canonical ? canonical.href : window.location.href;
    }

    analyzePageStructure() {
        return {
            hasMainContent: !!document.querySelector('main, article, [role="main"]'),
            hasNavigation: !!document.querySelector('nav, [role="navigation"]'),
            hasHeader: !!document.querySelector('header, [role="banner"]'),
            hasFooter: !!document.querySelector('footer, [role="contentinfo"]'),
            hasSidebar: !!document.querySelector('aside, .sidebar, [role="complementary"]'),
            headingLevels: this.getHeadingLevels(),
            estimatedContentType: this.estimateContentType()
        };
    }

    getHeadingLevels() {
        const levels = [];
        for (let i = 1; i <= 6; i++) {
            if (document.querySelector(`h${i}`)) {
                levels.push(i);
            }
        }
        return levels;
    }

    estimateContentType() {
        const title = document.title.toLowerCase();
        const url = window.location.href.toLowerCase();
        const content = document.body.textContent.toLowerCase();
        
        if (url.includes('/blog/') || url.includes('/article/') || 
            title.includes('blog') || content.includes('published')) {
            return 'article';
        }
        
        if (url.includes('/news/') || title.includes('news')) {
            return 'news';
        }
        
        if (url.includes('/product/') || content.includes('price') || 
            content.includes('buy now')) {
            return 'product';
        }
        
        if (url.includes('/about') || title.includes('about')) {
            return 'about';
        }
        
        return 'general';
    }

    calculateReadabilityMetrics() {
        const text = document.body.textContent || '';
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const syllables = this.countSyllables(text);
        
        return {
            wordCount: words.length,
            sentenceCount: sentences.length,
            averageWordsPerSentence: words.length / Math.max(sentences.length, 1),
            averageSyllablesPerWord: syllables / Math.max(words.length, 1),
            estimatedGradeLevel: this.calculateFleschKincaid(words.length, sentences.length, syllables)
        };
    }

    countWords(text) {
        if (!text || typeof text !== 'string') {
            return 0;
        }
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    estimateReadingTime(text) {
        const wordsPerMinute = 200; // Average reading speed
        const wordCount = this.countWords(text);
        return Math.ceil(wordCount / wordsPerMinute);
    }

    countSyllables(text) {
        // Simple syllable counting algorithm
        const words = text.toLowerCase().split(/\s+/);
        let syllableCount = 0;
        
        words.forEach(word => {
            word = word.replace(/[^a-z]/g, '');
            if (word.length === 0) return;
            
            const vowels = word.match(/[aeiouy]+/g);
            let count = vowels ? vowels.length : 0;
            
            // Adjust for silent e
            if (word.endsWith('e')) count--;
            
            // Ensure at least 1 syllable per word
            syllableCount += Math.max(count, 1);
        });
        
        return syllableCount;
    }

    calculateFleschKincaid(words, sentences, syllables) {
        if (sentences === 0 || words === 0) return 0;
        
        const avgSentenceLength = words / sentences;
        const avgSyllablesPerWord = syllables / words;
        
        return 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;
    }
}

// Initialize content extractor
const webBrieferExtractor = new WebBrieferContentExtractor();