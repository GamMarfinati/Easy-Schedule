# Guia de Deploy Seguro na Vercel

Este guia explica como colocar seu aplicativo no ar usando GitHub e Vercel, mantendo sua chave de API segura.

## 1. Preparação do Código (Já realizado)

O código já está pronto para a Vercel.

- A pasta `api/` contém a "Serverless Function" que a Vercel usa automaticamente.
- O arquivo `.gitignore` foi configurado para ignorar o arquivo `.env`, impedindo que sua chave vaze para o GitHub.

## 2. Subir para o GitHub

1.  Crie um novo repositório no GitHub (ex: `horaprofe`).
2.  No terminal do seu projeto, inicialize o git (se ainda não fez):
    ```bash
    git init
    git add .
    git commit -m "Primeiro commit"
    ```
3.  Conecte ao seu repositório remoto e envie o código:
    ```bash
    git branch -M main
    git remote add origin https://github.com/SEU_USUARIO/horaprofe.git
    git push -u origin main
    ```

## 3. Configurar na Vercel

1.  Acesse [vercel.com](https://vercel.com) e faça login.
2.  Clique em **"Add New..."** -> **"Project"**.
3.  Selecione o repositório `horaprofe` que você acabou de criar (clique em "Import").
4.  Na tela de configuração ("Configure Project"):

    - **Framework Preset**: O Vercel deve detectar "Vite" automaticamente.
    - **Root Directory**: Deixe como `./`.
    - **Environment Variables** (IMPORTANTE):
      - Clique para expandir esta seção.
      - Adicione uma nova variável:
        - **Key**: `GEMINI_API_KEY`
        - **Value**: `Sua_Chave_Aqui` (Copie a chave do seu arquivo `.env` local: `AIza...`)
      - Clique em **Add**.

5.  Clique em **Deploy**.

## 4. Resultado

A Vercel vai construir seu site e fornecerá um link (ex: `https://horaprofe.vercel.app`).

- O frontend funcionará normalmente.
- Quando você clicar em "Gerar Grade", o frontend chamará `/api/generate`.
- A Vercel interceptará essa chamada e executará o arquivo `api/generate.ts` usando a chave segura que você configurou no painel, sem nunca expô-la no código do frontend.
