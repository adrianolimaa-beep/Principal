# Template de subida - atleta externo

Objetivo: comparar um atleta ainda nao contratado com o seu grupo e com atletas da mesma posicao, calculando percentis em poucas metricas.

## Regra recomendada

Use **1 linha por jogo** do atleta externo.

Isso e melhor do que subir apenas uma media final porque:
- permite calcular media, mediana e percentil com base em varios jogos
- deixa a comparacao mais justa com a base do dashboard, que tambem trabalha jogo a jogo
- permite filtrar por periodo, competicao ou quantidade minima de jogos

## Colunas obrigatorias

- `candidateId`
  - identificador fixo do atleta externo
  - exemplo: `EXT001`
- `athleteName`
  - nome do atleta
- `position`
  - use exatamente a posicao que voce quer comparar no dashboard
  - exemplos recomendados: `GOLEIRO`, `ZAGUEIRO`, `LATERAL`, `MEIO CAMPO`, `EXTREMO`, `CENTROAVANTE`
- `club`
  - clube atual ou ultimo clube
- `season`
  - temporada do dado
  - exemplo: `2026`
- `competition`
  - competicao do jogo
  - exemplo: `Brasileirao`
- `matchDate`
  - data do jogo em formato `YYYY-MM-DD`
- `minutes`
  - minutos jogados no jogo
- `totalDistanceMeters`
  - distancia total em metros
- `highIntensityMeters`
  - alta intensidade em metros
  - regra esperada: o que for equivalente ao seu conceito atual de alta intensidade
- `accelerationsB23`
  - numero de aceleracoes no recorte que voce quer usar como padrao
- `decelerationsB23`
  - numero de desaceleracoes no mesmo recorte
- `source`
  - origem do dado
  - exemplo: `Wyscout`, `StatsBomb`, `Catapult`, `CSV clube`

## Coluna opcional

- `notes`
  - observacoes livres
  - exemplo: `amistoso`, `entrou no intervalo`, `dado manual`

## Padrao de preenchimento

- Distancias sempre em metros
- Aceleracoes e desaceleracoes sempre em contagem
- `minutes` como numero, sem texto
- `matchDate` sempre em `YYYY-MM-DD`
- Nao misture medias com jogos na mesma planilha

## Recomendacao minima de amostra

Para um percentil mais confiavel:
- ideal: `5` a `10` jogos do atleta externo
- aceitavel: `3` jogos
- abaixo disso: leitura muito sensivel a um unico jogo

## Como eu sugiro usar no comparativo

Metricas principais:
- `accelerationsB23`
- `decelerationsB23`
- `totalDistanceMeters`
- `highIntensityMeters`

Comparacoes:
- percentil do atleta externo contra todos os atletas do grupo
- percentil contra atletas da mesma `position`
- media por jogo do atleta externo vs media por jogo do elenco

## Observacao importante

Se a fonte externa nao usar exatamente a mesma definicao de alta intensidade, aceleracao ou desaceleracao da sua base interna, o ideal e marcar isso em `source` ou `notes`, porque isso pode distorcer o percentil.
