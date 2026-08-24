# Deploy privado no Vercel

Este diretório pode ser publicado como um projeto estático no Vercel.

## Root Directory

No Vercel, configure a root do projeto como:

`outputs/load-dashboard`

Arquivos usados no deploy:

- `index.html`
- `app.js`
- `styles.css`
- `data.js`
- `vercel.json`

## Proteção recomendada

Situação confirmada em sexta-feira, 7 de agosto de 2026:

- `Vercel Authentication` existe em todos os planos
- no plano Hobby, a proteção padrão não cobre o domínio final de produção
- para proteger também o domínio de produção, use `Deployment Protection` com `All Deployments` em Pro ou Enterprise
- `Password Protection` exige Enterprise ou o add-on `Advanced Deployment Protection` no Pro

Referências oficiais:

- `https://vercel.com/docs/deployment-protection`
- `https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/password-protection`

## Configuração sugerida

1. Criar um projeto novo no Vercel apontando para este repositório
2. Definir `outputs/load-dashboard` como `Root Directory`
3. Confirmar o preset como `Other`
4. Em `Settings > Deployment Protection`, selecionar `All Deployments`
5. Escolher um destes métodos:
   `Vercel Authentication` para acesso só de usuários autorizados no Vercel
   `Password Protection` se a conta estiver em Pro com add-on ou Enterprise

## Observações do app

- o botão `Atualizar dados` fica desabilitado quando o app não está em `localhost`, `127.0.0.1` ou aberto via arquivo local
- a atualização diária deve continuar fora do Vercel, regenerando `data.js` antes de publicar uma nova versão
- `data.js` contém dados sensíveis; não publique sem proteção
