// vite.config.js
import basicSsl from '@vitejs/plugin-basic-ssl'

export default {
  base: '/ar-lab5/',
  plugins: [
    basicSsl({
      /** name of certification */
      name: 'test',
      /** custom trust domains */
      domains: ['*.custom.com'],
      /** custom certification directory */
      certDir: '/Users/.../.devServer/cert',
    }),
  ],
}