import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [website, setWebsite] = useState('');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [userPreferences, setUserPreferences] = useState({
    style: '',
    size: '',
    color: '',
    occasion: ''
  });
  const [budget, setBudget] = useState('');
  const [toolsUsed, setToolsUsed] = useState([]);
  const [collections, setCollections] = useState([]);

  // Welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `👋 Welcome to your **Smart E-commerce Assistant**! \n\nI'm your AI shopping companion powered by advanced AI. I can help you:\n\n🔍 **Find Products** - Search with filters, categories, and price ranges\n🌐 **Research** - Get product reviews and market information  \n💰 **Budget Planning** - Find the best deals within your budget\n🎯 **Personalized Recommendations** - Based on your style preferences\n📊 **Compare Products** - Side-by-side comparisons\n📦 **Check Inventory** - Real-time availability\n🚚 **Shipping Info** - Delivery estimates and costs\n\n**Try asking me:**\n- "Find men's sneakers under $200"\n- "What are the best hoodies for winter?"\n- "Compare these products: [product IDs]"\n- "Research the latest fashion trends"\n- "Recommend outfits for a wedding"\n\nWhat would you like to shop for today?`,
      timestamp: new Date()
    }]);
  }, []);

  const sendMessage = async (customPrompt) => {
    console.log('sendMessage called with:', customPrompt);
    console.log('Current prompt state:', prompt);
    console.log('Current website state:', website);
    
    // Ignore event objects
    if (customPrompt && typeof customPrompt === 'object' && (customPrompt.nativeEvent || customPrompt.target)) {
      console.log('Ignoring event object');
      return;
    }
    
    const actualPrompt = customPrompt !== undefined ? customPrompt : prompt;
    console.log('Actual prompt to send:', actualPrompt);
    
    if (!String(actualPrompt || '').trim()) {
      console.log('Empty prompt, returning');
      return;
    }

    if (!website.trim()) {
      console.log('No website URL provided');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Please enter a valid Shopify store URL first!',
        timestamp: new Date()
      }]);
      return;
    }

    const userMessage = {
      role: 'user',
      content: actualPrompt,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      console.log('Sending request to API with:', {
        website,
        prompt: actualPrompt,
        userPreferences,
        budget,
        occasion: userPreferences.occasion,
        showProducts,
        startIndex
      });
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website,
          prompt: actualPrompt,
          userPreferences,
          budget,
          occasion: userPreferences.occasion,
          showProducts,
          startIndex
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.reply,
        products: data.products || [],
        hasMore: data.hasMore,
        totalProducts: data.totalProducts,
        toolsUsed: data.toolsUsed || [],
        collections: data.collections || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setToolsUsed(data.toolsUsed || []);
      setStartIndex(data.nextStartIndex || 0);
      setCollections(data.collections || []);

    } catch (error) {
      console.error('Error in sendMessage:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreProducts = () => {
    setShowProducts(true);
    sendMessage();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `👋 Welcome to your **Smart E-commerce Assistant**! \n\nI'm your AI shopping companion powered by advanced AI. I can help you:\n\n🔍 **Find Products** - Search with filters, categories, and price ranges\n🌐 **Research** - Get product reviews and market information  \n💰 **Budget Planning** - Find the best deals within your budget\n🎯 **Personalized Recommendations** - Based on your style preferences\n📊 **Compare Products** - Side-by-side comparisons\n📦 **Check Inventory** - Real-time availability\n🚚 **Shipping Info** - Delivery estimates and costs\n\n**Try asking me:**\n- "Find men's sneakers under $200"\n- "What are the best hoodies for winter?"\n- "Compare these products: [product IDs]"\n- "Research the latest fashion trends"\n- "Recommend outfits for a wedding"\n\nWhat would you like to shop for today?`,
      timestamp: new Date()
    }]);
    setStartIndex(0);
    setShowProducts(false);
    setToolsUsed([]);
    setCollections([]);
  };

  // Product Card Component
  const ProductCard = ({ product }) => {
    const handleClick = () => {
      if (product.productUrl) {
        window.open(product.productUrl, '_blank');
      }
    };

    return (
      <div 
        className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer product-card"
        onClick={handleClick}
      >
        {/* Product Image */}
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm hidden">
            📷 No Image
          </div>
          
          {/* Price Badge */}
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-sm font-bold">
            ${product.price}
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-2 line-clamp-2 leading-tight">
            {product.title}
          </h3>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {product.productType || 'Product'}
            </span>
            {product.vendor && (
              <span className="text-xs text-blue-600 font-medium">
                {product.vendor}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-green-600">
              ${product.price} <span className="text-xs text-gray-500 font-normal">USD</span>
            </span>
            {product.available !== undefined && (
              <span className={`text-xs px-2 py-1 rounded ${
                product.available 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {product.available ? 'In Stock' : 'Out of Stock'}
              </span>
            )}
          </div>

          {/* View Details Button */}
          <button className="w-full mt-3 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
            View Details →
          </button>
        </div>
      </div>
    );
  };

  // Products Grid Component
  const ProductsGrid = ({ products, hasMore, onLoadMore }) => {
    if (!products || products.length === 0) return null;

    return (
      <div className="mt-6">
        {/* Products Header */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            🛍️ Found {products.length} Products
          </h3>
          <p className="text-sm text-gray-600">
            Click on any product to view details and purchase
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <ProductCard key={`${product.id}-${index}`} product={product} />
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={onLoadMore}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-8 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              📦 Load More Products
            </button>
          </div>
        )}
      </div>
    );
  };

  // Collections Bar Component
  const CollectionsBar = ({ collections }) => {
    if (!collections || collections.length === 0) return null;
    return (
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <span className="font-semibold text-gray-700 mr-2">Collections:</span>
        {collections.map((col, idx) => (
          <button
            key={col.handle + idx}
            className="bg-blue-100 hover:bg-blue-300 text-blue-800 px-3 py-1 rounded-full text-xs font-medium transition-colors"
            onClick={() => sendMessage(`Show me products from the ${col.title} collection`)}
          >
            {col.title}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Head>
        <title>Smart E-commerce Assistant</title>
        <meta name="description" content="AI-powered shopping assistant with advanced features" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🛍️ Smart E-commerce Assistant
          </h1>
          <p className="text-gray-600 text-lg">
            Your AI shopping companion with advanced features
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - User Preferences */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                ⚙️ Preferences
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store URL
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 font-medium"
                    placeholder="https://store.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget
                  </label>
                  <input
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 font-medium"
                    placeholder="e.g., $200, under 100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Style Preference
                  </label>
                  <input
                    type="text"
                    value={userPreferences.style}
                    onChange={(e) => setUserPreferences(prev => ({ ...prev, style: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 font-medium"
                    placeholder="e.g., casual, formal, streetwear"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size
                  </label>
                  <input
                    type="text"
                    value={userPreferences.size}
                    onChange={(e) => setUserPreferences(prev => ({ ...prev, size: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 font-medium"
                    placeholder="e.g., M, L, XL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Occasion
                  </label>
                  <input
                    type="text"
                    value={userPreferences.occasion}
                    onChange={(e) => setUserPreferences(prev => ({ ...prev, occasion: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 font-medium"
                    placeholder="e.g., work, casual, formal"
                  />
                </div>

                <button
                  onClick={clearChat}
                  className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  🗑️ Clear Chat
                </button>
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Chat Messages */}
              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {/* Show collections bar above the product grid/messages */}
                <CollectionsBar collections={collections} />
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-4xl rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      
                      {/* Tools Used Indicator */}
                      {message.toolsUsed && message.toolsUsed.length > 0 && (
                        <div className="mt-2 text-xs opacity-75">
                          🔧 Used: {message.toolsUsed.join(', ')}
                        </div>
                      )}
                      
                      {/* Products Grid */}
                      {message.products && message.products.length > 0 && (
                        <ProductsGrid 
                          products={message.products}
                          hasMore={message.hasMore}
                          onLoadMore={loadMoreProducts}
                        />
                      )}
                      
                      <div className="text-xs opacity-50 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-4 max-w-3xl">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-gray-600">🤔 Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t p-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about shopping! Try: 'Find men's sneakers under $200' or 'Research the latest fashion trends'"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-500 font-medium"
                      rows="2"
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !prompt.trim()}
                    className={`px-6 py-3 rounded-lg transition-colors ${
                      isLoading || !prompt.trim() 
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                    title={!prompt.trim() ? 'Enter a message first' : ''}
                  >
                    {isLoading ? '⏳' : '🚀'} Send
                  </button>
                </div>
                
                {/* Quick Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setPrompt("Find men's sneakers under $200")}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
                  >
                    👟 Sneakers
                  </button>
                  <button
                    onClick={() => setPrompt("Show me the best hoodies")}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
                  >
                    🧥 Hoodies
                  </button>
                  <button
                    onClick={() => setPrompt("Research latest fashion trends")}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
                  >
                    📰 Trends
                  </button>
                  <button
                    onClick={() => setPrompt("Recommend outfits for work")}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
                  >
                    💼 Work
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>
            Powered by Google Gemini AI • Advanced E-commerce Assistant
          </p>
          <p className="mt-1">
            Features: 🔍 Smart Search • 💰 Budget Planning • 📊 Price Analysis • 🎯 Personalized Recommendations
          </p>
        </div>
      </div>
    </div>
  );
}
