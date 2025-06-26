# 🛍️ Smart E-commerce Assistant

Your AI-powered shopping companion for any Shopify store!

---

## Features

- 🤖 **AI Chatbot**: Natural language shopping assistant powered by Google Gemini (Gemini 1.5 Flash)
- 🔍 **Smart Product Search**: Search, filter, and browse products with advanced AI
- 💰 **Price Analysis**: Find the cheapest, most expensive, or best value products
- 🎯 **Personalized Recommendations**: Get suggestions based on your style, budget, and occasion
- 🌐 **Web Research**: Research trends, reviews, and more
- 📦 **Inventory & Shipping**: Check stock and delivery options
- 🛒 **Beautiful UI**: Responsive, modern, and easy to use

---

## Getting Started

### 1. **Clone the Repository**
```sh
git clone https://github.com/hariantara/shop-ai-chat.git
cd shop-ai-chat
```

### 2. **Install Dependencies**
```sh
npm install
```

### 3. **Set Up Environment Variables**
Create a `.env.local` file with your Google Gemini API key:
```
GOOGLE_API_KEY=your_google_gemini_api_key
```

### 4. **Run the App**
```sh
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

- Enter any **Shopify store URL** (e.g., `https://kith.com`)
- Set your **preferences** (budget, style, size, occasion)
- Ask anything! Try:
  - `Find men's sneakers under $200`
  - `Show me the best hoodies`
  - `What are the cheapest products?`
  - `Research the latest fashion trends`
  - `Recommend outfits for work`
- Click on product cards to view details on the store

---

## Tech Stack
- **Next.js** (React)
- **Tailwind CSS**
- **Google Gemini AI** (`@google/generative-ai`)
- **Node.js**

---

## Credits
- Built by [@hariantara](https://github.com/hariantara)
- Powered by Google Gemini AI

---

## License
[MIT](LICENSE) 