# Walkthrough: Correção e Deploy do Easy-Schedule

Este documento resume as etapas realizadas para corrigir a aplicação, rodá-la localmente e fazer o deploy com sucesso na Vercel.

## 1. Problemas Identificados

1.  **Versão do Node.js**: O ambiente local estava com Node v12, incompatível com Vite 6 e React 19 (requerem Node 18+).
    *   **Solução**: Atualização para Node v20.
2.  **Execução Local da API**: O Vite não executa nativamente funções serverless da pasta `api/`.
    *   **Solução**: Criação de um servidor Express local (`server.ts`) e configuração de proxy no `vite.config.ts`.
3.  **Segurança**: Necessidade de proteger a chave da API Gemini.
    *   **Solução**: Uso de arquivo `.env` (adicionado ao `.gitignore`) e configuração de Variáveis de Ambiente na Vercel.
4.  **Erro no Deploy (Vercel)**: A Vercel não estava roteando corretamente a API e falhava ao importar arquivos externos (`types.ts`, `constants.ts`) na função serverless.
    *   **Solução**: Criação do `vercel.json` para rotas e refatoração de `api/generate.ts` para ser autossuficiente (inlining de dependências).

## 2. Resultado Final

A aplicação está rodando perfeitamente na Vercel.

### Geração de Grade (Sucesso)
A IA processa o pedido e gera a grade sem erros.

![Loading State](/home/gam/.gemini/antigravity/brain/e2175442-692f-43b7-a3a7-efff0867ac50/uploaded_image_0_1763655035860.png)

![Grade Gerada](/home/gam/.gemini/antigravity/brain/e2175442-692f-43b7-a3a7-efff0867ac50/uploaded_image_1_1763655035860.png)

## 3. Como Manter

*   **Desenvolvimento Local**: Rode `npm run dev:all` para iniciar frontend e backend.
*   **Deploy**:
    1.  Commit suas alterações: `git commit -am "Mensagem"`
    2.  Envie para o GitHub: `git push origin main`
    3.  A Vercel atualiza automaticamente.
