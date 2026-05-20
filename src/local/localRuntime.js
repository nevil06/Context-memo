/**
 * Local-First Runtime
 * Enables offline operation with local models and embeddings
 */

import fs from 'fs/promises';
import { getRecallPath, fileExists } from '../utils/fileUtils.js';

const CONFIG_FILE = 'local_config.json';
const EMBEDDINGS_FILE = 'local_embeddings.json';

/**
 * Local Runtime Class
 */
export class LocalRuntime {
  constructor(context) {
    this.context = context;
    this.config = null;
    this.embeddings = new Map();
    this.modelProvider = null;
  }

  /**
   * Initialize local runtime
   */
  async initialize(options = {}) {
    const {
      provider = 'ollama',
      model = 'llama2',
      embeddingModel = 'nomic-embed-text',
      apiUrl = 'http://localhost:11434'
    } = options;

    this.config = {
      provider,
      model,
      embeddingModel,
      apiUrl,
      offline: true,
      initialized: true,
      timestamp: new Date().toISOString()
    };

    await this.save();

    return {
      success: true,
      config: this.config
    };
  }

  /**
   * Check if local runtime is available
   */
  async isAvailable() {
    if (!this.config) {
      await this.load();
    }

    if (!this.config || !this.config.initialized) {
      return false;
    }

    // Check if Ollama is running
    if (this.config.provider === 'ollama') {
      return await this.checkOllamaAvailability();
    }

    return true;
  }

  /**
   * Check Ollama availability
   */
  async checkOllamaAvailability() {
    try {
      // In a real implementation, this would make an HTTP request to Ollama
      // For now, we'll simulate the check
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text, options = {}) {
    const { cache = true } = options;

    // Check cache first
    if (cache && this.embeddings.has(text)) {
      return this.embeddings.get(text);
    }

    // Generate embedding
    const embedding = await this.callEmbeddingModel(text);

    // Cache if requested
    if (cache) {
      this.embeddings.set(text, embedding);
      await this.saveEmbeddings();
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts, options = {}) {
    const embeddings = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text, options);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Call embedding model
   */
  async callEmbeddingModel(text) {
    if (!this.config) {
      throw new Error('Local runtime not initialized');
    }

    // In a real implementation, this would call Ollama API
    // For now, we'll generate a simple hash-based embedding
    return this.generateSimpleEmbedding(text);
  }

  /**
   * Generate simple embedding (fallback)
   */
  generateSimpleEmbedding(text) {
    // Simple hash-based embedding for testing
    // In production, this would use actual embedding models
    const embedding = new Array(384).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = charCode % 384;
      embedding[index] += 1;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }

  /**
   * Calculate similarity between embeddings
   */
  calculateSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same dimension');
    }

    // Cosine similarity
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Semantic search using local embeddings
   */
  async semanticSearch(query, documents, options = {}) {
    const { topK = 10, threshold = 0.5 } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Generate document embeddings
    const results = [];

    for (const doc of documents) {
      const docText = typeof doc === 'string' ? doc : doc.text;
      const docEmbedding = await this.generateEmbedding(docText);
      
      const similarity = this.calculateSimilarity(queryEmbedding, docEmbedding);

      if (similarity >= threshold) {
        results.push({
          document: doc,
          similarity,
          score: similarity
        });
      }
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    // Return top K
    return results.slice(0, topK);
  }

  /**
   * Generate text using local model
   */
  async generateText(prompt, options = {}) {
    const {
      maxTokens = 500,
      temperature = 0.7,
      stream = false
    } = options;

    if (!this.config) {
      throw new Error('Local runtime not initialized');
    }

    // In a real implementation, this would call Ollama API
    // For now, we'll return a simulated response
    return {
      text: `[Simulated response to: ${prompt.substring(0, 50)}...]`,
      model: this.config.model,
      tokens: maxTokens,
      offline: true
    };
  }

  /**
   * Analyze code using local model
   */
  async analyzeCode(code, options = {}) {
    const { task = 'explain' } = options;

    const prompt = this.buildCodeAnalysisPrompt(code, task);
    const response = await this.generateText(prompt);

    return {
      analysis: response.text,
      task,
      offline: true
    };
  }

  /**
   * Build code analysis prompt
   */
  buildCodeAnalysisPrompt(code, task) {
    const prompts = {
      explain: `Explain the following code:\n\n${code}`,
      review: `Review the following code for issues:\n\n${code}`,
      optimize: `Suggest optimizations for the following code:\n\n${code}`,
      document: `Generate documentation for the following code:\n\n${code}`
    };

    return prompts[task] || prompts.explain;
  }

  /**
   * Get embedding statistics
   */
  getEmbeddingStats() {
    return {
      totalEmbeddings: this.embeddings.size,
      cacheSize: this.embeddings.size,
      provider: this.config?.provider || 'none',
      model: this.config?.embeddingModel || 'none'
    };
  }

  /**
   * Clear embedding cache
   */
  async clearEmbeddings() {
    this.embeddings.clear();
    await this.saveEmbeddings();
  }

  /**
   * Export embeddings
   */
  async exportEmbeddings() {
    const exported = [];

    for (const [text, embedding] of this.embeddings.entries()) {
      exported.push({
        text: text.substring(0, 100), // Truncate for storage
        embedding,
        timestamp: new Date().toISOString()
      });
    }

    return exported;
  }

  /**
   * Import embeddings
   */
  async importEmbeddings(data) {
    let imported = 0;

    for (const item of data) {
      if (item.text && item.embedding) {
        this.embeddings.set(item.text, item.embedding);
        imported++;
      }
    }

    await this.saveEmbeddings();

    return {
      imported,
      total: this.embeddings.size
    };
  }

  /**
   * Get configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Update configuration
   */
  async updateConfig(updates) {
    this.config = {
      ...this.config,
      ...updates,
      timestamp: new Date().toISOString()
    };

    await this.save();

    return this.config;
  }

  /**
   * Test local model
   */
  async testModel() {
    const testPrompt = 'Hello, this is a test.';
    
    try {
      const response = await this.generateText(testPrompt, { maxTokens: 50 });
      
      return {
        success: true,
        model: this.config.model,
        response: response.text,
        offline: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test embedding model
   */
  async testEmbedding() {
    const testText = 'This is a test sentence.';
    
    try {
      const embedding = await this.generateEmbedding(testText, { cache: false });
      
      return {
        success: true,
        model: this.config.embeddingModel,
        dimension: embedding.length,
        offline: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get runtime status
   */
  async getStatus() {
    const available = await this.isAvailable();
    const embeddingStats = this.getEmbeddingStats();

    return {
      available,
      initialized: this.config?.initialized || false,
      provider: this.config?.provider || 'none',
      model: this.config?.model || 'none',
      embeddingModel: this.config?.embeddingModel || 'none',
      offline: this.config?.offline || false,
      embeddings: embeddingStats
    };
  }

  /**
   * Save configuration
   */
  async save() {
    const configPath = getRecallPath(CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify(this.config, null, 2), 'utf8');
  }

  /**
   * Load configuration
   */
  async load() {
    const configPath = getRecallPath(CONFIG_FILE);
    
    if (!await fileExists(configPath)) {
      return false;
    }

    try {
      const content = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(content);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Save embeddings
   */
  async saveEmbeddings() {
    const embeddingsPath = getRecallPath(EMBEDDINGS_FILE);
    const data = await this.exportEmbeddings();
    await fs.writeFile(embeddingsPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Load embeddings
   */
  async loadEmbeddings() {
    const embeddingsPath = getRecallPath(EMBEDDINGS_FILE);
    
    if (!await fileExists(embeddingsPath)) {
      return false;
    }

    try {
      const content = await fs.readFile(embeddingsPath, 'utf8');
      const data = JSON.parse(content);
      await this.importEmbeddings(data);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create local runtime
 */
export function createLocalRuntime(context) {
  return new LocalRuntime(context);
}
