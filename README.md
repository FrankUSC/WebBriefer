# WebBriefer 🤖📄

**Transform complex web content into personalized, accessible summaries using Chrome's built-in AI capabilities.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![Built with Chrome AI](https://img.shields.io/badge/Built%20with-Chrome%20AI-4285F4)](https://developer.chrome.com/docs/ai/built-in)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🏆 Submission for Google Chrome Built-in AI Challenge 2025**

WebBriefer is an intelligent Chrome extension that leverages Chrome's cutting-edge built-in AI APIs to transform complex web content into personalized, accessible summaries. By analyzing user profiles (age, occupation, education level) and webpage content, it generates tailored summaries that adapt to different comprehension levels and language preferences.

## ✨ Features

### 🎯 **Personalized AI Summaries**
- **Profile-Based Adaptation**: Summaries tailored to your age, occupation, and education level
- **Smart Language Adjustment**: Automatically adjusts vocabulary complexity and technical depth
- **Multi-Language Support**: Translate summaries to 20+ languages including Spanish, French, German, Japanese, Chinese, and more

### 🧠 **Chrome Built-in AI Integration**
- **Gemini Nano**: Powered by Google's on-device language model for privacy-first AI processing
- **Summarizer API**: Generates concise, key-point focused summaries
- **Translator API**: Real-time translation to your preferred language
- **Prompt API**: Contextual Q&A based on webpage content

### 🔒 **Privacy-First Design**
- **100% Local Processing**: All AI operations happen on your device
- **No External Servers**: Zero data transmission to third parties
- **Local Storage Only**: Your profile and preferences stay on your device
- **No Account Required**: Works immediately without sign-up

### 💬 **Interactive Q&A**
- **Follow-up Questions**: Ask questions about the summarized content
- **Contextual Answers**: AI provides answers based on the original webpage content
- **Conversation History**: Track your questions and answers within each session

### 🎨 **Modern Material Design UI**
- **Clean Interface**: Intuitive popup design following Material Design principles
- **Responsive Layout**: Optimized for different screen sizes and content lengths
- **Accessibility**: Full keyboard navigation and screen reader support
- **Loading States**: Smooth animations and skeleton loading for better UX

## 🚀 Installation

### Prerequisites
- **Google Chrome Canary** (version 127+) with AI features enabled
- **Chrome AI Origin Trial** access (required for built-in AI APIs)

### Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/WebBriefer.git
   cd WebBriefer
   ```

2. **Enable Chrome AI Features**
   - Open Chrome Canary
   - Navigate to `chrome://flags/`
   - Enable the following flags:
     - `#optimization-guide-on-device-model`
     - `#prompt-api-for-gemini-nano`
     - `#summarization-api-for-gemini-nano`
     - `#translation-api`
   - Restart Chrome

3. **Load the Extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked" and select the WebBriefer directory
   - The extension icon should appear in your toolbar

4. **Initial Setup**
   - Click the WebBriefer icon in your toolbar
   - Complete the profile setup with your age, occupation, and language preferences
   - Start browsing and generating summaries!

## 📖 Usage Guide

### Getting Started

1. **Profile Setup** (First Time Only)
   - Click the WebBriefer extension icon
   - Fill out your profile information:
     - **Age**: Helps adjust content complexity
     - **Occupation**: Tailors technical language and examples
     - **Education Level**: Determines vocabulary sophistication
     - **Preferred Language**: For summary translations
     - **Summary Style**: Choose between balanced, concise, detailed, or bullet points

2. **Generate Summaries**
   - Navigate to any webpage with substantial text content
   - Click the WebBriefer icon
   - Wait 3-5 seconds for AI processing
   - View your personalized summary in the popup

3. **Ask Follow-up Questions**
   - After viewing a summary, use the Q&A section
   - Type questions like:
     - "What are the main benefits mentioned?"
     - "Can you explain this in simpler terms?"
     - "What are the key statistics?"
   - Get contextual answers based on the original content

### Best Practices

- **Optimal Content**: Works best on articles, blog posts, news stories, and research papers
- **Content Length**: Most effective on pages with 500+ words
- **Language Support**: Primary content in English works best, with translation available for summaries
- **Question Types**: Ask specific questions about content details, explanations, or clarifications

## 🛠️ Technical Architecture

### Chrome Built-in AI APIs Used

#### 1. **Language Model API (Gemini Nano)**
```javascript
const session = await ai.languageModel.create({
  systemPrompt: `You are helping a ${userProfile.age}-year-old ${userProfile.occupation}...`
});
```
- **Purpose**: Contextual Q&A and fallback summarization
- **Model**: Gemini Nano (on-device)
- **Privacy**: 100% local processing

#### 2. **Summarizer API**
```javascript
const summarizer = await ai.summarizer.create({
  type: 'key-points',
  format: 'plain-text',
  length: 'medium'
});
```
- **Purpose**: Primary summarization engine
- **Output**: ~500 word structured summaries
- **Focus**: Key points and main ideas extraction

#### 3. **Translator API**
```javascript
const translator = await ai.translator.create({
  sourceLanguage: 'en',
  targetLanguage: userProfile.preferredLanguage
});
```
- **Purpose**: Real-time summary translation
- **Languages**: 20+ supported languages
- **Fallback**: Language Model API for unsupported languages

### Extension Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Content       │    │   Background     │    │   Popup         │
│   Script        │◄──►│   Service        │◄──►│   Interface     │
│   (content.js)  │    │   Worker         │    │   (popup.html)  │
│                 │    │   (background.js)│    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   DOM Content   │    │   Chrome AI      │    │   User Profile  │
│   Extraction    │    │   APIs           │    │   Management    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Components

- **Content Script**: Extracts webpage text, images, and metadata
- **Background Service Worker**: Coordinates AI API calls and data processing
- **Popup Interface**: Displays summaries and handles user interactions
- **Options Page**: Profile setup and preference management
- **Chrome Storage**: Local storage for user profiles and cache

### Data Flow

1. **Content Extraction**: Content script analyzes current webpage
2. **Profile Context**: Background worker retrieves user profile
3. **AI Processing**: Generates personalized prompts and summaries
4. **Translation**: Converts summaries to preferred language if needed
5. **Display**: Popup shows formatted summary with Q&A interface

## 📁 Project Structure

```
WebBriefer/
├── manifest.json           # Extension configuration
├── popup.html             # Main popup interface
├── popup.js               # Popup logic and UI management
├── options.html           # Settings page
├── options.js             # Profile setup and preferences
├── content.js             # Webpage content extraction
├── background.js          # AI coordination service worker
├── styles/
│   ├── popup.css          # Popup styling (Material Design)
│   └── options.css        # Options page styling
├── icons/
│   ├── icon16.svg         # Extension icon (16x16)
│   ├── icon32.svg         # Extension icon (32x32)
│   ├── icon48.svg         # Extension icon (48x48)
│   └── icon128.svg        # Extension icon (128x128)
├── README.md              # This file
└── package.json           # Project metadata
```

## 🧪 Testing

### Manual Testing Checklist

1. **Installation & Setup**
   - [ ] Extension loads without errors
   - [ ] Profile setup completes successfully
   - [ ] Settings save and persist

2. **Core Functionality**
   - [ ] Content extraction works on various websites
   - [ ] Summaries generate within 5 seconds
   - [ ] Summaries adapt to user profile
   - [ ] Translation works for non-English preferences

3. **Q&A Feature**
   - [ ] Questions submit successfully
   - [ ] Answers are contextually relevant
   - [ ] Character limit enforced (200 chars)
   - [ ] History displays correctly

4. **UI/UX**
   - [ ] Popup displays correctly
   - [ ] Loading states show appropriately
   - [ ] Error handling works
   - [ ] Responsive design functions

### Test Websites

- **News Articles**: BBC, CNN, Reuters
- **Blog Posts**: Medium, personal blogs
- **Academic Papers**: arXiv, research publications
- **Technical Documentation**: MDN, API docs

## 🔧 Development

### Prerequisites for Development

```bash
# Node.js (for package management)
node --version  # v18+

# Chrome Canary with AI flags enabled
# See installation instructions above
```

### Development Setup

```bash
# Clone and setup
git clone https://github.com/yourusername/WebBriefer.git
cd WebBriefer

# Install dependencies (if any)
npm install

# Load extension in Chrome
# Follow installation instructions above
```

### Code Style

- **JavaScript**: ES2020+ with async/await
- **CSS**: Material Design principles
- **HTML**: Semantic markup with accessibility
- **Architecture**: Manifest V3 service workers

## 🤝 Contributing

We welcome contributions to WebBriefer! Here's how you can help:

### Areas for Contribution

1. **UI/UX Improvements**: Enhanced Material Design implementation
2. **Language Support**: Additional language translations and localizations
3. **Content Extraction**: Better parsing for specific website types
4. **Accessibility**: Screen reader and keyboard navigation improvements
5. **Performance**: Optimization for faster processing

### Contribution Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Google Chrome Built-in AI Challenge 2025

WebBriefer is proudly submitted to the **Google Chrome Built-in AI Challenge 2025**. This extension showcases the power of Chrome's built-in AI APIs to create privacy-first, personalized web experiences.

### Challenge Highlights

- **Innovation**: First extension to combine all three Chrome AI APIs for personalized content summarization
- **Privacy**: 100% local processing with no external server dependencies
- **Accessibility**: Adaptive content for different user backgrounds and languages
- **User Experience**: Seamless integration with natural web browsing workflows

## 🙏 Acknowledgments

- **Google Chrome Team**: For developing the revolutionary built-in AI APIs
- **Material Design**: For the comprehensive design system
- **Chrome Extension Community**: For best practices and inspiration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/WebBriefer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/WebBriefer/discussions)
- **Email**: support@webbriefer.com

---

**Made with ❤️ for the Google Chrome Built-in AI Challenge 2025**

*Transform the way you consume web content with AI-powered personalization.*

languageModel
: 
false
summarizer
: 
true
summarizerStatus
: 
"downloadable"
translator
: 
true
translatorStatus
: 
"unavailable"
