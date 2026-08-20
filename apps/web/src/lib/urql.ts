import { Client, cacheExchange, fetchExchange } from 'urql';

// Minimal auth configuration for URQL. 
// We will grab the token from localStorage (noted as a tradeoff in README vs httpOnly cookies)
export const client = new Client({
  url: 'http://localhost:4000/graphql',
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: () => {
    const token = localStorage.getItem('token');
    return {
      headers: { authorization: token ? `Bearer ${token}` : '' },
    };
  },
});
