import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Os testes de rota sobem a API inteira sobre o mesmo PGlite local (data/pglite).
    // Dois arquivos abrindo o mesmo diretório ao mesmo tempo corrompem o banco.
    fileParallelism: false,
  },
});
