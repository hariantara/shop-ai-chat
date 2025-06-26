import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Define tools for the AI assistant
const tools = [
  {
    functionDeclarations: [
      {
        name: "search_products",
        description: "Search for products in the store with advanced filtering",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for products"
            },
            category: {
              type: "string", 
              description: "Product category (men, women, kids, footwear, etc.)"
            },
            price_range: {
              type: "string",
              description: "Price range filter (e.g., 'under 100', '50-200')"
            },
            brand: {
              type: "string",
              description: "Brand filter"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "web_search",
        description: "Search the web for product reviews, comparisons, and market information",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for web research"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "analyze_prices",
        description: "Analyze product prices and provide recommendations",
        parameters: {
          type: "object",
          properties: {
            products: {
              type: "string",
              description: "JSON string of products to analyze"
            },
            budget: {
              type: "string",
              description: "User's budget constraint"
            }
          },
          required: ["products"]
        }
      },
      {
        name: "get_product_recommendations",
        description: "Get personalized product recommendations based on user preferences",
        parameters: {
          type: "object",
          properties: {
            user_preferences: {
              type: "string",
              description: "User's style preferences and requirements"
            },
            budget: {
              type: "string",
              description: "User's budget"
            },
            occasion: {
              type: "string",
              description: "Occasion or use case"
            }
          },
          required: ["user_preferences"]
        }
      },
      {
        name: "compare_products",
        description: "Compare multiple products side by side",
        parameters: {
          type: "object",
          properties: {
            product_ids: {
              type: "string",
              description: "Comma-separated list of product IDs to compare"
            }
          },
          required: ["product_ids"]
        }
      },
      {
        name: "check_inventory",
        description: "Check product availability and inventory status",
        parameters: {
          type: "object",
          properties: {
            product_id: {
              type: "string",
              description: "Product ID to check inventory for"
            }
          },
          required: ["product_id"]
        }
      },
      {
        name: "get_shipping_info",
        description: "Get shipping information and delivery estimates",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "Shipping location"
            },
            items: {
              type: "string",
              description: "Items to ship"
            }
          },
          required: ["location"]
        }
      }
    ]
  }
];

// Synonym map for common fashion terms
const synonymMap = {
  jacket: ['jacket', 'outerwear', 'coat', 'blazer', 'flight jacket', 'track jacket'],
  boots: ['boot', 'boots', 'footwear', 'shoes', 'chelsea', 'combat'],
  shirt: ['shirt', 'tee', 't-shirt', 'polo', 'top', 'button up', 'button-down'],
  pants: ['pants', 'trousers', 'jeans', 'denim', 'chino', 'slacks'],
  sneakers: ['sneaker', 'sneakers', 'shoes', 'trainers', 'kicks'],
  shorts: ['short', 'shorts', 'bermuda', 'cargo short'],
  hoodie: ['hoodie', 'sweatshirt', 'pullover', 'hooded'],
  dress: ['dress', 'gown', 'maxi', 'midi', 'mini'],
  skirt: ['skirt', 'mini skirt', 'midi skirt', 'maxi skirt'],
  hat: ['hat', 'cap', 'beanie', 'bucket', 'snapback'],
  bag: ['bag', 'backpack', 'tote', 'duffle', 'crossbody', 'purse'],
  sandal: ['sandal', 'flip flop', 'slides', 'slipper'],
  coat: ['coat', 'overcoat', 'parka', 'trench', 'peacoat'],
  suit: ['suit', 'blazer', 'jacket', 'trousers', 'pants'],
  // Add more as needed
};

function expandQuery(query) {
  if (!query) return [];
  const lower = query.toLowerCase();
  for (const key in synonymMap) {
    if (lower.includes(key)) {
      return synonymMap[key];
    }
  }
  return [query];
}

// Helper to validate Shopify store
async function isValidShopifyStore(url) {
  try {
    const res = await fetch(url.replace(/\/$/, '') + '/products.json');
    const data = await res.json();
    return Array.isArray(data.products);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Check if API key is configured
  if (!process.env.GOOGLE_API_KEY) {
    console.error("❌ GOOGLE_API_KEY environment variable is not set");
    return res.status(500).json({ 
      error: "AI service is not properly configured. Please check the server configuration.",
      details: "Missing Google API key"
    });
  }

  const { 
    website, 
    prompt, 
    userPreferences = {}, 
    budget = null,
    occasion = null,
    showProducts = false,
    startIndex = 0 
  } = req.body;

  if (!website || !prompt) {
    return res.status(400).json({ error: "Missing website or prompt" });
  }

  // Store validation step
  const isValid = await isValidShopifyStore(website);
  if (!isValid) {
    return res.status(400).json({
      error: "This doesn't appear to be a valid Shopify store. Please check the URL or try another store."
    });
  }

  try {
    // Initialize the AI model with tools
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      tools: tools,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      }
    });

    // Fetch products from the store
    const { products, collections } = await fetchStoreProducts(website);
    
    if (!products || products.length === 0) {
      return res.status(200).json({
        reply: "I couldn't find any products from this store. Please check the website URL or try a different store.",
        products: [],
        collections: [],
        hasMore: false
      });
    }

    // Build context for the AI
    const context = buildContext(products, userPreferences, budget, occasion);
    
    // Create the full prompt
    const fullPrompt = `You are a Smart E-commerce Assistant, an advanced AI shopping companion that helps users find the perfect products.

${context}

User Request: "${prompt}"

User Preferences: ${JSON.stringify(userPreferences)}
Budget: ${budget || 'Not specified'}
Occasion: ${occasion || 'Not specified'}

IMPORTANT INSTRUCTIONS:
1. If the user asks for products (like "find sneakers", "show me hoodies", "men's clothing", etc.), ALWAYS use the search_products function first to find actual products.
2. If the user asks for research or trends, use the web_search function.
3. If the user asks for price analysis, use the analyze_prices function.
4. If the user asks for recommendations, use the get_product_recommendations function.
5. Be proactive - don't just suggest options, actually execute the functions and show results.
6. Always provide specific, actionable results based on the function outputs.

For product searches, automatically extract search terms from the user's request and use search_products with appropriate filters. Don't ask the user what they want to try - just do it!`;

    console.log("🤖 Smart E-commerce Assistant processing request...");

    // Generate response with potential function calls
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;

    // Check if AI wants to use tools
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      console.log(`🔧 AI requested ${functionCalls.length} tool(s):`, functionCalls.map(call => call.name));
      
      // Execute function calls
      const functionResponses = await Promise.all(
        functionCalls.map(async (call) => {
          const result = await executeFunction(call.name, call.args, products, website);
          return {
            name: call.name,
            response: result
          };
        })
      );

      // Create a new prompt with function results
      const functionResultsText = functionResponses.map(fr => 
        `Function ${fr.name} returned: ${JSON.stringify(fr.response, null, 2)}`
      ).join('\n\n');

      const followUpPrompt = `${fullPrompt}

I executed the requested functions and here are the results:

${functionResultsText}

Please provide a helpful response to the user based on these function results.`;

      // Send function results back to AI for final response
      const followUpResult = await model.generateContent(followUpPrompt);
      const finalResponse = await followUpResult.response;
      
      // Format products for display if needed
      const displayProducts = showProducts ? 
        formatProductsForDisplay(products.slice(startIndex, startIndex + 10)) : [];

      // Check if any function returned products and include them
      let functionProducts = [];
      functionResponses.forEach(fr => {
        if (fr.response && fr.response.products && Array.isArray(fr.response.products)) {
          functionProducts = functionProducts.concat(fr.response.products);
        }
      });

      // Use function products if available, otherwise use paginated products
      const finalProducts = functionProducts.length > 0 ? functionProducts : displayProducts;

      res.status(200).json({
        reply: finalResponse.text(),
        products: finalProducts,
        collections: collections,
        hasMore: functionProducts.length > 0 ? false : products.length > startIndex + 10,
        totalProducts: functionProducts.length > 0 ? functionProducts.length : products.length,
        toolsUsed: functionCalls.map(call => call.name),
        nextStartIndex: functionProducts.length > 0 ? null : (products.length > startIndex + 10 ? startIndex + 10 : null)
      });

    } else {
      // No function calls needed, return direct response
      const displayProducts = showProducts ? 
        formatProductsForDisplay(products.slice(startIndex, startIndex + 10)) : [];

      res.status(200).json({
        reply: response.text(),
        products: displayProducts,
        collections: collections,
        hasMore: products.length > startIndex + 10,
        totalProducts: products.length,
        nextStartIndex: products.length > startIndex + 10 ? startIndex + 10 : null
      });
    }

  } catch (error) {
    console.error("❌ Smart E-commerce Assistant error:", error);
    res.status(500).json({ 
      error: "AI assistant failed", 
      details: error.message 
    });
  }
}

// Function executor
async function executeFunction(name, args, products, website) {
  console.log(`🔧 Executing function: ${name}`, args);
  
  switch (name) {
    case 'search_products':
      return await searchProducts(products, args, website);
    
    case 'web_search':
      return await webSearch(args.query);
    
    case 'analyze_prices':
      return await analyzePrices(args.products, args.budget);
    
    case 'get_product_recommendations':
      return await getRecommendations(products, args);
    
    case 'compare_products':
      return await compareProducts(products, args.product_ids);
    
    case 'check_inventory':
      return await checkInventory(args.product_id);
    
    case 'get_shipping_info':
      return await getShippingInfo(args.location, args.items);
    
    default:
      return { error: `Unknown function: ${name}` };
  }
}

// Fetch products from store
async function fetchStoreProducts(website) {
  const baseUrl = website.replace(/\/$/, "");
  let allProducts = new Map();
  let endpoints = [];
  let collectionsList = [];

  // Always try the main products endpoint
  endpoints.push(baseUrl + "/products.json?currency=USD");

  // Dynamically fetch all collections for this store
  try {
    const collectionsRes = await fetch(baseUrl + "/collections.json");
    const collectionsData = await collectionsRes.json();
    const collections = collectionsData.collections || [];
    collectionsList = collections.map(col => ({ title: col.title, handle: col.handle }));
    // Add each collection's products endpoint
    for (const col of collections) {
      endpoints.push(`${baseUrl}/collections/${col.handle}/products.json?currency=USD`);
    }
  } catch (err) {
    console.log(`⚠️ Failed to fetch collections.json:`, err.message);
  }

  for (let url of endpoints) {
    try {
      console.log(`🔍 Fetching from: ${url}`);
      const response = await fetch(url);
      const json = await response.json();
      const fetchedProducts = json.products || [];
      if (fetchedProducts.length > 0) {
        console.log(`✅ Found ${fetchedProducts.length} products from ${url}`);
        fetchedProducts.forEach(product => {
          if (!allProducts.has(product.id)) {
            allProducts.set(product.id, product);
          }
        });
      }
    } catch (err) {
      console.log(`⚠️ Failed to fetch from ${url}:`, err.message);
      continue;
    }
  }

  const products = Array.from(allProducts.values());
  console.log(`📦 Total unique products: ${products.length}`);
  return { products, collections: collectionsList };
}

// Build context for AI
function buildContext(products, userPreferences, budget, occasion) {
  const productTypes = [...new Set(products.map(p => p.product_type).filter(Boolean))];
  const brands = [...new Set(products.map(p => p.vendor).filter(Boolean))];
  
  const priceRange = products.length > 0 ? {
    min: Math.min(...products.map(p => parseFloat(p.variants?.[0]?.price || 0))),
    max: Math.max(...products.map(p => parseFloat(p.variants?.[0]?.price || 0)))
  } : null;

  return `Store Information:
- Total Products: ${products.length}
- Product Categories: ${productTypes.slice(0, 10).join(', ')}${productTypes.length > 10 ? ', and more' : ''}
- Brands: ${brands.slice(0, 10).join(', ')}${brands.length > 10 ? ', and more' : ''}
- Price Range: ${priceRange ? `$${priceRange.min.toFixed(2)} - $${priceRange.max.toFixed(2)}` : 'Not available'}

Available Tools:
- search_products: Find specific products with filters
- web_search: Research products online
- analyze_prices: Compare prices and get recommendations
- get_product_recommendations: Get personalized suggestions
- compare_products: Side-by-side product comparison
- check_inventory: Check product availability
- get_shipping_info: Get shipping details`;
}

// Tool implementations
async function searchProducts(products, args, storeUrl) {
  const { query, category, price_range, brand } = args;
  
  console.log(`🔍 Searching products with:`, { query, category, price_range, brand });
  console.log(`📦 Total products to search: ${products.length}`);

  // Expand query with synonyms
  const queries = expandQuery(query);
  
  let filtered = products.filter(product => {
    const title = (product.title || '').toLowerCase();
    const productType = (product.product_type || '').toLowerCase();
    const vendor = (product.vendor || '').toLowerCase();
    const tags = Array.isArray(product.tags) ? product.tags.join(' ').toLowerCase() : (product.tags || '').toLowerCase();
    
    // Text search - use expanded queries
    const matchesQuery = queries.some(q => {
      const regex = new RegExp(`\\b${q}\\b`, 'i');
      return regex.test(title) || regex.test(productType) || regex.test(tags) || regex.test(vendor);
    });
    
    // Category filter - be more flexible
    const matchesCategory = category ? 
      title.includes(category.toLowerCase()) || 
      productType.includes(category.toLowerCase()) || 
      tags.includes(category.toLowerCase()) ||
      vendor.includes(category.toLowerCase()) : true;
    
    // Brand filter
    const matchesBrand = brand ? 
      vendor.includes(brand.toLowerCase()) || 
      title.includes(brand.toLowerCase()) : true;
    
    return matchesQuery && matchesCategory && matchesBrand;
  });

  // Price range filter - improved logic
  if (price_range) {
    console.log(`💰 Filtering by price range: ${price_range}`);
    const priceText = price_range.toLowerCase();
    
    if (priceText.includes('under') || priceText.includes('below') || priceText.includes('less than')) {
      const maxPrice = parseFloat(priceText.replace(/[^0-9.-]/g, ''));
      const beforeCount = filtered.length;
      filtered = filtered.filter(p => {
        const price = parseFloat(p.variants?.[0]?.price || 0);
        return price > 0 && price < maxPrice;
      });
      console.log(`💰 Price filter (under $${maxPrice}): ${beforeCount} → ${filtered.length} products`);
    } else if (priceText.includes('over') || priceText.includes('above') || priceText.includes('more than')) {
      const minPrice = parseFloat(priceText.replace(/[^0-9.-]/g, ''));
      const beforeCount = filtered.length;
      filtered = filtered.filter(p => {
        const price = parseFloat(p.variants?.[0]?.price || 0);
        return price > 0 && price > minPrice;
      });
      console.log(`💰 Price filter (over $${minPrice}): ${beforeCount} → ${filtered.length} products`);
    } else if (priceText.includes('cheapest') || priceText.includes('lowest')) {
      // Sort by price ascending
      filtered.sort((a, b) => {
        const priceA = parseFloat(a.variants?.[0]?.price || 0);
        const priceB = parseFloat(b.variants?.[0]?.price || 0);
        return priceA - priceB;
      });
      console.log(`💰 Sorted by price (cheapest first): ${filtered.length} products`);
    } else if (priceText.includes('expensive') || priceText.includes('highest')) {
      // Sort by price descending
      filtered.sort((a, b) => {
        const priceA = parseFloat(a.variants?.[0]?.price || 0);
        const priceB = parseFloat(b.variants?.[0]?.price || 0);
        return priceB - priceA;
      });
      console.log(`💰 Sorted by price (most expensive first): ${filtered.length} products`);
    }
  }

  console.log(`✅ Search completed: Found ${filtered.length} products`);

  return {
    found: filtered.length,
    products: filtered.slice(0, 20).map(p => formatProduct(p, storeUrl || args.website || '')),
    total: filtered.length,
    searchTerms: { query, category, price_range, brand }
  };
}

async function webSearch(query) {
  try {
    // Using a free search API (you can replace with your preferred service)
    const searchQuery = encodeURIComponent(query);
    const response = await fetch(`https://api.duckduckgo.com/?q=${searchQuery}&format=json&no_html=1&skip_disambig=1`);
    const data = await response.json();
    
    return {
      query: query,
      results: data.AbstractText ? [{
        title: data.Heading || query,
        snippet: data.AbstractText,
        url: data.AbstractURL
      }] : [],
      source: "DuckDuckGo"
    };
  } catch (error) {
    return {
      query: query,
      error: "Search failed",
      results: []
    };
  }
}

async function analyzePrices(productsJson, budget) {
  try {
    const products = JSON.parse(productsJson);
    
    if (!products || products.length === 0) {
      return { error: "No products to analyze" };
    }

    const prices = products.map(p => parseFloat(p.price || 0)).filter(p => p > 0);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    let recommendation = "";
    if (budget) {
      const budgetNum = parseFloat(budget.replace(/[^0-9.-]/g, ''));
      const affordable = products.filter(p => parseFloat(p.price || 0) <= budgetNum);
      recommendation = `Found ${affordable.length} products within your budget of $${budgetNum}.`;
    }

    return {
      analysis: {
        total_products: products.length,
        average_price: `$${avgPrice.toFixed(2)}`,
        price_range: `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`,
        budget_recommendation: recommendation
      },
      products: products.slice(0, 5).map(formatProduct)
    };
  } catch (error) {
    return { error: "Price analysis failed" };
  }
}

async function getRecommendations(products, args) {
  const { user_preferences, budget, occasion } = args;
  
  // Simple recommendation logic (can be enhanced)
  let filtered = products;
  
  if (budget) {
    const budgetNum = parseFloat(budget.replace(/[^0-9.-]/g, ''));
    filtered = filtered.filter(p => parseFloat(p.variants?.[0]?.price || 0) <= budgetNum);
  }

  // Filter by preferences
  if (user_preferences) {
    const prefs = user_preferences.toLowerCase();
    filtered = filtered.filter(p => {
      const title = (p.title || '').toLowerCase();
      const productType = (p.product_type || '').toLowerCase();
      return title.includes(prefs) || productType.includes(prefs);
    });
  }

  return {
    recommendations: filtered.slice(0, 8).map(formatProduct),
    reasoning: `Based on your preferences: ${user_preferences}${budget ? `, budget: ${budget}` : ''}${occasion ? `, occasion: ${occasion}` : ''}`,
    total_found: filtered.length
  };
}

async function compareProducts(products, productIds) {
  const ids = productIds.split(',').map(id => id.trim());
  const selectedProducts = products.filter(p => ids.includes(p.id.toString()));
  
  if (selectedProducts.length === 0) {
    return { error: "No products found for comparison" };
  }

  return {
    comparison: selectedProducts.map(formatProduct),
    summary: `Comparing ${selectedProducts.length} products`,
    features: selectedProducts.map(p => ({
      id: p.id,
      title: p.title,
      price: p.variants?.[0]?.price || 'N/A',
      type: p.product_type || 'N/A'
    }))
  };
}

async function checkInventory(productId) {
  // Mock inventory check (in real implementation, you'd check actual inventory)
  return {
    product_id: productId,
    in_stock: Math.random() > 0.3, // 70% chance of being in stock
    quantity: Math.floor(Math.random() * 50) + 1,
    estimated_delivery: "3-5 business days"
  };
}

async function getShippingInfo(location, items) {
  // Mock shipping info
  return {
    location: location,
    shipping_methods: [
      { name: "Standard", cost: "$5.99", delivery: "5-7 days" },
      { name: "Express", cost: "$12.99", delivery: "2-3 days" },
      { name: "Overnight", cost: "$24.99", delivery: "1 day" }
    ],
    free_shipping_threshold: "$50.00"
  };
}

// Helper functions
function formatProduct(product, storeUrl) {
  const price = product.variants?.[0]?.price || "N/A";
  let formattedPrice = "N/A";
  if (price !== "N/A") {
    const numPrice = parseFloat(price);
    formattedPrice = numPrice > 10000
      ? (numPrice / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // Ensure storeUrl has no trailing slash
  const base = storeUrl.replace(/\/$/, "");
  return {
    id: product.id,
    title: product.title,
    price: formattedPrice,
    image: product.images?.[0]?.src || null,
    productType: product.product_type || '',
    vendor: product.vendor || '',
    handle: product.handle || '',
    productUrl: product.handle ? `${base}/products/${product.handle}` : null,
    available: product.variants?.[0]?.available || false
  };
}

function formatProductsForDisplay(products) {
  return products.map(formatProduct);
}
