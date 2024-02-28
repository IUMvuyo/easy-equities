var axiosConfig = require("./axiosConfig");
var constants = require("./constants");

module.exports = {
  /**
   * Fetches educational articles from a predefined source.
   * @returns {Promise<Array>} A list of educational articles.
   */
  async fetchArticles() {
    // Example: Fetch articles from a predefined API or source
    const options = {
      headers: constants.headers,
      method: "GET",
      url: "https://example.com/api/articles", // Replace with your actual API endpoint
    };
    const response = await axiosConfig.httpClient(options);
    if (response.status !== 200) {
      throw new Error("Failed to fetch articles.");
    }
    return response.data;
  },

  /**
   * Fetches educational videos from a predefined source.
   * @returns {Promise<Array>} A list of educational videos.
   */
  async fetchVideos() {
    // Example: Fetch videos from a predefined API or source
    const options = {
      headers: constants.headers,
      method: "GET",
      url: "https://example.com/api/videos", // Replace with your actual API endpoint
    };
    const response = await axiosConfig.httpClient(options);
    if (response.status !== 200) {
      throw new Error("Failed to fetch videos.");
    }
    return response.data;
  },

  /**
   * Fetches interactive modules from a predefined source.
   * @returns {Promise<Array>} A list of interactive modules.
   */
  async fetchInteractiveModules() {
    // Example: Fetch interactive modules from a predefined API or source
    const options = {
      headers: constants.headers,
      method: "GET",
      url: "https://example.com/api/modules", // Replace with your actual API endpoint
    };
    const response = await axiosConfig.httpClient(options);
    if (response.status !== 200) {
      throw new Error("Failed to fetch interactive modules.");
    }
    return response.data;
  },
};
