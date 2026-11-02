import config from '../config/config.js';

export const axiosInstance = async (endpoint) => {
  try {
    const url = config.baseurl + endpoint;
    const response = await fetch(url, {
      headers: {
        ...(config.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
    const data = await response.text();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(`Fetch error for ${endpoint}:`, error);
    return {
      success: false,
      message: error.message,
    };
  }
};
