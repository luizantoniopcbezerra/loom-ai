export const PLANNER_PROMPT = `---
date: 16-04-2026
name: task-sdd-planner
description: Monta um planejamento de implementação orientado por SDD a partir de uma task (feature, bug, fix, melhoria, implementação do zero) e do desenvolvedor responsável informados pelo usuário, lendo seletivamente a codebase relacionada. Use quando for preciso transformar uma task em um plano executável com ESPECIFICAÇÕES como fonte da verdade.
tags:
  - skill/task-sdd-planner
  - planning
  - sdd
disable-model-invocation: true
---

# Task SDD Planner

Gera um plano de implementação antes do código. A task e o desenvolvedor responsável são informados como parâmetros. A codebase atual é a fonte de contexto. As **ESPECIFICAÇÕES** producedas por este plano são a **FONTE DA VERDADE** — tudo que vier depois deve estar 100% fundamentado nelas.

## Entradas

| Entrada | Obrigatório | Fonte | Descrição |
| --- | --- | --- | --- |
| \`task\` | Sim | pedido do usuário | Task (feature, bug, fix, melhoria ou implementação do zero) a ser planejada, pode ser em formato de texto ou arquivo mencionado |
| \`desenvolvedor\` | Sim | pedido do usuário | Nome do desenvolvedor responsável pela implementação |
| \`branch\` | Sim | pedido do usuário | Branch onde a task será implementada |
| \`codebase\` | Sim | workspace atual | Projeto onde a task será implementada |
| \`docs_path\` | Não | workspace atual (padrão: \`docs/\`) | Pasta onde será salvo o documento de implementação |

*Caso falte algum parâmetro de entrada, deve parar a execução e solicitar ao usuário o preenchimento de todos os parâmetros.*

## Objetivo

Produzir um plano de implementação seguindo este fluxo obrigatório:

1. **Ler a task** — entender o que foi pedido, delimitar escopo, registrar suposições.
2. **Ler a codebase** — identificar arquivos, padrões, contratos e pontos de impacto relacionados à task.
3. **Montar as ESPECIFICAÇÕES** — consolidar tudo que foi lido em um plano executável. As SPECS são a fonte da verdade; nenhuma decisão de implementação deve existir fora delas.
4. **Criar documento de implementação** — salvar o plano em um arquivo markdown na pasta \`docs/\` do projeto.

Não inverter a ordem. Não propor implementação antes de explicitar as especificações.

## Fluxo de Trabalho

### 1. Ler a task

- Resumir a task em uma frase objetiva.
- Identificar o resultado esperado e o critério de aceite.
- Delimitar escopo e fora de escopo.
- Registrar suposições quando houver ambiguidade — adotar a interpretação mais conservadora.

### 2. Ler a codebase relacionada

Investigar o mínimo necessário para entender onde a task toca.

Começar por:

- busca textual por termos da feature, nomes de domínio, endpoints, eventos, labels de UI e entidades;
- arquivos de contrato, documentação, testes e implementações próximas;
- pontos de entrada prováveis: rotas, controllers, handlers, services, casos de uso, componentes, repositórios, schemas.

Durante a leitura:

- usar \`rg\` para localizar arquivos, símbolos e termos;
- abrir somente os arquivos que confirmam comportamento, padrões, contratos e impacto;
- anotar caminhos concretos que justificam cada parte do plano;
- distinguir claramente o que é fato observado e o que é inferência.

Se não houver relação clara com a task, registrar a lacuna em vez de inventar contexto.

### 3. Montar as Especificações

Com base exclusivamente no que foi lido, produzir o plano no formato abaixo. As especificações são a **FONTE DA VERDADE**: qualquer implementação, teste ou decisão posterior deve referenciar e respeitar o que está aqui. Se algo não estiver especificado, não deve ser implementado.

### 4. Criar documento de implementação

Ao final do planejamento, criar um arquivo markdown na pasta \`docs/\` do projeto com o nome:

\`\`\`
IMPLEMENTATION_PLAN_{NOME_DA_TASK}.md
\`\`\`

Exemplo: \`docs/IMPLEMENTATION_PLAN_LOGIN_GOOGLE_20260416_143022.md\`

O documento deve conter o plano completo gerado na etapa anterior.

## Formato da Saída

Entregar a resposta em Markdown com esta estrutura:

\`\`\`markdown
# Plano de implementação - {NOME DA TASK}

> {data de criação}
> Branch: {branch informado}
> Desenvolvedor responsável: {nome do desenvolvedor}

## Resumo sobre a task

- objetivo da task em uma frase;
- resultado esperado e critério de aceite;
- escopo (o que está dentro);
- fora de escopo (o que não será feito).

## Padrões a preservar

- convenções de código, arquitetura e nomenclatura observadas na codebase;
- contratos de API, schemas ou estruturas de dados que devem ser mantidos;
- padrões de teste existentes.

## Arquivos existentes que se relacionam com a task

- lista de arquivos com caminho real e breve descrição da relação com a task;
- distinguir fatos observados de inferências.

## Dependências externas

- bibliotecas, serviços, APIs ou integrações necessárias;
- pré-condições que precisam existir antes da implementação.

## Ordem recomendada de implementação

- sequência sugerida de passos, do menor risco ao maior;
- indicar onde escrever testes antes do código (TDD) quando aplicável;
- registrar riscos técnicos e pontos de atenção por etapa.
\`\`\`

## Regras de Qualidade

- Referenciar caminhos reais do projeto sempre que possível.
- Sinalizar claramente fatos observados versus inferências.
- Evitar plano genérico; conectar cada seção com o que foi lido na codebase.
- Evitar overengineering; preferir o menor desenho que entregue a task.
- Registrar lacunas sem bloquear desnecessariamente o planejamento.
- Nunca propor implementação fora do escopo especificado.

## Definição de Pronto

O plano está pronto quando outro engenheiro consegue, sem reinventar o escopo:

1. escrever ou revisar documentação e contrato a partir do **Resumo da task**;
2. criar testes que falham com base nas especificações;
3. implementar somente o que está na **Ordem recomendada**;
4. revisar coerência, regressão e qualidade antes do merge;
5. se a review reprovar algo, voltar às SPECS e repetir o fluxo.`

export const SPEC_WRITER_PROMPT = `---
date: 16-04-2026
name: spec-document-writer
description: Cria os dois artefatos de SPEC de uma feature, \`documentacao.md\` para desenvolvedores e \`contrato.yaml\` para IA, a partir de uma descrição funcional, regra de negócio ou backlog. Use quando for preciso transformar uma feature em documentação humana e contrato operacional estruturado, mantendo ambos sincronizados e coerentes.
tags:
  - skill/spec-document-writer
  - spec
  - markdown
  - yaml
disable-model-invocation: true
---

# Spec Document Writer

Gera os dois documentos-base de uma feature:

- \`documentacao.md\`: spec voltada para humanos, usada pelos devs como guia de entendimento e implementação;
- \`contrato.yaml\`: spec operacional voltada para IA, usada como contrato estruturado para execução da task com o mínimo de ambiguidade.

## Entradas

| Entrada | Obrigatório | Fonte | Descrição |
| --- | --- | --- | --- |
| \`plano\` | Sim | pedido do usuário | Planejamento das features |

## Objetivo

Produzir uma SPEC dupla e coerente:

1. \`documentacao.md\` para devs
2. \`contrato.yaml\` para IA

Os dois documentos devem descrever a mesma feature, sem divergência de regra, input, output, erro ou fluxo.

## Princípios

- Tratar os dois artefatos como duas visões da mesma fonte de verdade.
- Especificar tudo de forma explícita; não deixar comportamento implícito.
- Manter nomes, regras e semântica consistentes entre Markdown e YAML.
- Preferir clareza e objetividade; evitar texto decorativo.
- Se faltar contexto, registrar a suposição em vez de inventar detalhes silenciosamente.

## Fluxo De Trabalho

### 1. Entender a feature

- Resumir a feature em uma frase objetiva.
- Identificar o propósito principal.
- Levantar regras de negócio.
- Identificar input, output, erros e fluxo.

Se alguma dessas partes não vier explícita, inferir com cautela e marcar como suposição.

### 2. Escrever primeiro o \`contrato.yaml\`

Começar pelo contrato estruturado, porque ele força precisão.

Regras para o YAML:

- usar nomes curtos e semânticos;
- manter \`feature\` e \`description\` claros e completos;
- incluir \`endpoint\` sempre que for uma operação de API REST;
- listar todas as regras de negócio em \`rules\` de forma precisa, sem ambiguidade e sem duplicar o que já está nos campos;
- mapear os campos de \`input\` e \`output\` com \`type\`, \`nullable\`, constraints e \`description\`;
- marcar campos sensíveis com \`sensitive: true\` no input;
- usar \`persist\` para documentar exatamente o que vai ao banco e como — especialmente campos derivados (ex: hash de senha);
- listar erros em \`errors\` com \`code\`, \`http_status\`, \`message\`, \`trigger\` e \`behavior\` quando houver ação pós-erro;
- registrar side effects em \`side_effects\` com \`type\`, \`timing\`, \`description\` e \`on_failure\`;
- registrar suposições em \`assumptions\` em vez de inventar silenciosamente;
- não misturar narrativa longa com o contrato.

### 3. Escrever depois a \`documentacao.md\`

Converter o mesmo conteúdo para uma leitura orientada ao dev.

Regras para o Markdown:

- escrever para desenvolvedores de nível estagiário-sênior, com linguagem clara e direta;
- usar o **Checklist de Implementação** como guia passo a passo para o dev;
- usar tabelas para input, output e errors — facilita leitura rápida;
- usar os mesmos conceitos, nomes e valores do YAML;
- explicar a intenção da feature na seção \`Descrição\`;
- nunca omitir um erro ou regra presente no contrato;
- evitar adicionar comportamento que não exista no contrato.

### 4. Validar coerência entre os dois documentos

Antes de concluir, conferir:

- se toda regra do YAML aparece no Markdown;
- se todo campo de \`input\` e \`output\` existe nos dois documentos;
- se os erros do YAML têm correspondência compreensível no Markdown;
- se o fluxo descrito não contradiz regras, inputs ou outputs;
- se não existe detalhe presente em um documento e ausente no outro sem justificativa.

## Formato Da Saída

Entregar os dois blocos completos, nesta ordem:

1. \`contrato.yaml\`
2. \`documentacao.md\`

Usar fenced code blocks com \`yaml\` e \`md\`.

## Organização Das Pastas

Cada documentação deve ser separada por pasta dentro de \`/specs\`, agrupando os arquivos por contexto de domínio ou módulo.

Estrutura esperada:

\`\`\`text
/specs
    /1-users
        /1-create-user
            create-user.yaml
            create-user.md
        /2-update-user
            update-user.yaml
            update-user.md
    /2-orders
        /1-create-order
            create-order.yaml
            create-order.md
\`\`\`

Regras para organização:

- cada feature deve viver dentro de uma pasta específica, como \`users\`, \`orders\` ou equivalente ao domínio;
- cada pasta deve ser numerada na sequência da implementação.
- os dois artefatos da mesma feature devem ficar lado a lado na mesma pasta;
- o nome-base dos arquivos deve ser o mesmo nos dois formatos, mudando apenas a extensão;

## Regras De Qualidade

- Não inventar campos ou regras sem sinalizar.
- Não usar códigos de erro vagos quando houver uma regra clara.
- Não deixar o YAML mais rico que o Markdown, nem o contrário.
- Preservar alinhamento semântico entre os dois documentos.
- Se houver termos técnicos ou nomes de domínio, reutilizar exatamente os nomes informados pelo usuário.

## Definição De Pronto

O trabalho está pronto quando:

1. o \`contrato.yaml\` estiver estruturado e coerente;
2. a \`documentacao.md\` estiver legível e equivalente ao contrato;
3. os dois documentos representarem a mesma feature sem divergência;
4. as suposições, se houver, estiverem explícitas.

Exemplo de output esperado:

**contrato.yaml**

\`\`\`yaml
feature: create-user
description: Cria um novo usuário no sistema com autenticação por e-mail e senha. O usuário começa com status "inactive" até confirmar o e-mail via link enviado após o cadastro.

endpoint:
  method: POST
  path: /users
  auth_required: false
  idempotent: false

rules:
  - e-mail deve ser normalizado para lowercase antes de qualquer comparação ou persistência
  - e-mail deve ser único no sistema (comparação feita após normalização)
  - e-mail deve estar em formato válido (RFC 5322)
  - nome deve ter entre 2 e 100 caracteres após trim de espaços
  - senha deve ter no mínimo 8 e no máximo 72 caracteres
  - senha deve conter ao menos 1 letra maiúscula, 1 número e 1 caractere especial
  - senha deve ser armazenada como hash bcrypt com cost mínimo 12; nunca persistir texto puro
  - usuário é criado com status "inactive" por padrão; nunca "active"
  - id deve ser gerado pela aplicação como UUID v4; nunca delegar ao banco
  - created_at deve ser gerado no momento da persistência em UTC
  - password e password_hash nunca devem aparecer em nenhuma resposta da API

input:
  name:
    type: string
    required: true
    nullable: false
    min_length: 2
    max_length: 100
    trim: true
    description: Nome completo ou de exibição do usuário
  email:
    type: string
    required: true
    nullable: false
    format: email
    normalize: lowercase
    description: E-mail de autenticação; usado também para o envio de confirmação
  password:
    type: string
    required: true
    nullable: false
    min_length: 8
    max_length: 72
    pattern: "^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).+$"
    sensitive: true
    description: Senha em texto puro; será hasheada com bcrypt antes de persistir

output:
  id:
    type: string
    format: uuid-v4
    nullable: false
    description: Identificador único do usuário gerado pela aplicação
  name:
    type: string
    nullable: false
    description: Nome do usuário conforme fornecido (após trim)
  email:
    type: string
    nullable: false
    description: E-mail normalizado para lowercase
  status:
    type: enum
    values: [inactive, active]
    nullable: false
    description: Estado do usuário; sempre "inactive" na criação
  created_at:
    type: string
    format: "YYYY-MM-DDTHH:mm:ssZ"
    nullable: false
    description: Data e hora de criação do registro em UTC (ISO 8601)

persist:
  table: users
  fields:
    - name: id
      source: gerado pela aplicação (UUID v4)
    - name: name
      source: input.name após trim
    - name: email
      source: input.email após normalização lowercase
    - name: password_hash
      source: bcrypt(input.password, cost=12)
    - name: status
      source: valor fixo "inactive"
    - name: created_at
      source: timestamp UTC no momento da persistência
  note: password nunca é persistido; somente password_hash

errors:
  - code: INVALID_INPUT
    http_status: 422
    message: "Os dados enviados são inválidos."
    trigger: qualquer campo ausente, nulo ou com valor fora do formato esperado (tamanho, tipo, formato de e-mail)
    fields_affected: [name, email, password]
    note: não cobre força da senha — para isso, usar WEAK_PASSWORD

  - code: WEAK_PASSWORD
    http_status: 422
    message: "A senha não atende aos requisitos mínimos de segurança."
    trigger: password presente e com formato válido, mas sem ao menos 1 maiúscula, 1 número ou 1 caractere especial, ou fora do intervalo 8–72 chars

  - code: EMAIL_ALREADY_EXISTS
    http_status: 409
    message: "O e-mail informado já está em uso."
    trigger: e-mail normalizado já encontrado na base de dados

  - code: EMAIL_DELIVERY_FAILED
    http_status: 500
    message: "Usuário criado, mas falha ao enviar e-mail de confirmação."
    trigger: persistência bem-sucedida seguida de erro no serviço de e-mail
    behavior: não reverter a criação; usuário existe e pode solicitar reenvio posteriormente

side_effects:
  - type: event
    name: user.created
    timing: sync
    description: publicar no message broker após persistência bem-sucedida
    payload: [id, email, created_at]
    on_failure: logar erro; não reverter criação

  - type: email
    name: confirmation-email
    timing: async
    description: disparar e-mail de confirmação após publicação do evento user.created
    on_failure: retornar EMAIL_DELIVERY_FAILED (500); não reverter criação

assumptions:
  - serviço de e-mail está disponível como dependência injetável no contexto da aplicação
  - message broker está configurado e acessível no ambiente de execução
  - banco de dados possui índice único em users.email (normalizado)
\`\`\`

---

**documentacao.md**

\`\`\`md
# Criar Usuário

## Descrição
Endpoint público para cadastro de novos usuários. Recebe nome, e-mail e senha, valida os dados, persiste o usuário com status \`inactive\` e dispara um e-mail de confirmação de forma assíncrona. Não é idempotente.

---

## Checklist de Implementação

### Validação de entrada
- [ ] Rejeitar campos ausentes ou nulos (\`name\`, \`email\`, \`password\`)
- [ ] Aplicar trim em \`name\` antes de validar comprimento
- [ ] Validar comprimento do \`name\` (2–100 chars após trim)
- [ ] Validar formato de e-mail (RFC 5322) — retornar \`INVALID_INPUT\` (422) se inválido
- [ ] Validar presença e tipo de \`password\` — retornar \`INVALID_INPUT\` (422) se ausente ou inválido
- [ ] Validar força da senha: 8–72 chars, ao menos 1 maiúscula, 1 número, 1 especial — retornar \`WEAK_PASSWORD\` (422) se falhar
- [ ] **Nota:** \`INVALID_INPUT\` cobre ausência/formato incorreto; \`WEAK_PASSWORD\` cobre exclusivamente força da senha

### Normalização e unicidade
- [ ] Normalizar \`email\` para lowercase após validação de formato
- [ ] Verificar unicidade do \`email\` normalizado na base — retornar \`EMAIL_ALREADY_EXISTS\` (409) se já existe

### Regras de negócio
- [ ] Gerar \`id\` como UUID v4 na camada de aplicação (não delegar ao banco)
- [ ] Hashear \`password\` com bcrypt (cost mínimo: 12) antes de salvar
- [ ] Definir \`status = inactive\` fixo na criação
- [ ] Gerar \`created_at\` em UTC no momento da persistência

### Persistência
- [ ] Salvar no banco: \`id\`, \`name\`, \`email\`, \`password_hash\`, \`status\`, \`created_at\`
- [ ] **Nunca salvar** \`password\` em texto puro — somente \`password_hash\`

### Pós-criação
- [ ] Publicar evento \`user.created\` no message broker (sync) com payload: \`id\`, \`email\`, \`created_at\`
- [ ] Se falhar ao publicar: logar erro, não reverter a criação
- [ ] Disparar e-mail de confirmação de forma **assíncrona** (não bloquear a resposta)
- [ ] Se o e-mail falhar: retornar \`EMAIL_DELIVERY_FAILED\` (500) — usuário já existe, não reverter

### Resposta
- [ ] Retornar: \`id\`, \`name\`, \`email\`, \`status\`, \`created_at\`
- [ ] **Nunca retornar** \`password\` ou \`password_hash\` em nenhuma resposta

---

## Input

| Campo      | Tipo   | Obrigatório | Regras                                          |
|------------|--------|-------------|--------------------------------------------------|
| \`name\`     | string | sim         | 2–100 chars após trim                           |
| \`email\`    | string | sim         | formato RFC 5322; normalizado para lowercase    |
| \`password\` | string | sim         | 8–72 chars, 1 maiúscula, 1 número, 1 especial   |

## Output

| Campo        | Tipo   | Descrição                                      |
|--------------|--------|------------------------------------------------|
| \`id\`         | string | UUID v4 gerado pela aplicação                  |
| \`name\`       | string | Nome do usuário (após trim)                    |
| \`email\`      | string | E-mail normalizado para lowercase              |
| \`status\`     | enum   | Sempre \`inactive\` na criação                   |
| \`created_at\` | string | Timestamp UTC no formato \`YYYY-MM-DDTHH:mm:ssZ\`|

## Errors

| Código                  | HTTP | Quando ocorre                                                         |
|-------------------------|------|-----------------------------------------------------------------------|
| \`INVALID_INPUT\`         | 422  | Campo ausente, nulo ou com formato/tamanho inválido                   |
| \`WEAK_PASSWORD\`         | 422  | Senha sem maiúscula, número ou caractere especial, ou fora de 8–72 chars |
| \`EMAIL_ALREADY_EXISTS\`  | 409  | E-mail normalizado já cadastrado na base                              |
| \`EMAIL_DELIVERY_FAILED\` | 500  | Usuário criado, mas falha no envio do e-mail de confirmação           |

---

## Fluxo

1. Receber \`name\`, \`email\`, \`password\` no body da requisição
2. Validar presença e formato de todos os campos — retornar \`INVALID_INPUT\` (422) se falhar
3. Validar força da senha — retornar \`WEAK_PASSWORD\` (422) se não atender ao padrão
4. Normalizar \`email\` para lowercase
5. Verificar unicidade do \`email\` normalizado — retornar \`EMAIL_ALREADY_EXISTS\` (409) se já existe
6. Hashear \`password\` com bcrypt (cost 12)
7. Persistir usuário: \`id\` (UUID v4), \`name\`, \`email\`, \`password_hash\`, \`status = inactive\`, \`created_at\` (UTC)
8. Publicar evento \`user.created\` no broker com \`id\`, \`email\`, \`created_at\`
9. Disparar e-mail de confirmação de forma assíncrona — retornar \`EMAIL_DELIVERY_FAILED\` (500) se falhar
10. Retornar os dados do usuário criado (sem senha)

---

## Suposições
- O serviço de e-mail é uma dependência injetável já configurada no ambiente
- O message broker está configurado e acessível no ambiente de execução
- O banco possui índice único em \`users.email\` (normalizado)
\`\`\``

export const FEATURE_IMPLEMENTATION_PROMPT = `---
date: 16-04-2026
name: feature-implementation
description: Implementa uma feature a partir de um \`contrato.yaml\`, tratando o contrato como fonte de verdade para testes, código, integrações e validação final. Use quando a SPEC já estiver pronta e for necessário desenvolver a feature na codebase atual com TDD, sem reinventar escopo, regras ou fluxos fora do contrato.
tags:
  - skill/feature-implementation
  - implementation
  - tdd
  - yaml
disable-model-invocation: true
---

# Feature Implementation

Executa o desenvolvimento de uma feature já especificada em \`contrato.yaml\`.

## Entradas

| Entrada | Obrigatório | Fonte | Descrição |
| --- | --- | --- | --- |
| \`contrato\` | Sim | arquivo informado pelo usuário | Caminho do \`contrato.yaml\` da feature |

## Objetivo

Entregar a feature funcionando com base no \`contrato.yaml\`, seguindo esta ordem obrigatória:

1. ler e validar o contrato;
2. escrever ou ajustar testes para representar o contrato;
3. coverage de testes ~95%;
4. refatorar sem alterar o comportamento contratado;
5. validar coerência final entre contrato, testes e código.

O \`contrato.yaml\` é a fonte da verdade. A implementação não deve inventar comportamento fora dele. **A SPEC (contrato) é a autoridade máxima** - qualquer decisão fora do escopo definido deve ser registrada como lacuna ou questionada antes de ser implementada.

## Princípios

- tratar o contrato como escopo fechado da implementação;
- Sempre usar TDD: \`red\`, \`green\`, \`refactor\`;
- preservar padrões já existentes da codebase;
- registrar suposições ou lacunas explicitamente;

### Princípios de Desenvolvimento (OBRIGATÓRIOS)

Estes princípios devem ser seguidos em toda implementação:

- **KISS** - Manter simplicidade operacional: resolver o problema atual com o menor número de partes possível, preferir clareza à esperteza, reduzir abstrações desnecessárias
- **YAGNI** - Não implementar antecipadamente: construir apenas o que o problema atual exige, adiar abstrações até necessidade comprovada
- **DRY** - Evitar duplicação de conhecimento: cada regra importante deve ter uma fonte principal de verdade, consolidar repetição real, não criar abstrações prematuras
- **Less Code, Best Code** - Menos código é melhor código: cada linha adicionada é uma linha que precisa ser lida, mantida e testada. Preferir deletar código a adicionar. A melhor solução geralmente é a que resolve o problema com menos código.

### Object Calisthenics (OBRIGATÓRIOS)

Regras de design que forçam código orientado a objetos com alta coesão e baixo acoplamento:

1. **Um nível de indentação por método** — se há mais de um nível, extrair método
2. **Não usar \`else\`** — usar early return, guard clauses ou polimorfismo
3. **Encapsular primitivos e strings** — tipos com regras de negócio devem ser Value Objects
4. **Coleções de primeira classe** — uma classe que contém uma coleção não deve ter outros atributos
5. **Um ponto por linha** — \`a.b.c()\` viola a Lei de Demeter; encapsular a navegação
6. **Não abreviar** — nomes devem ser descritivos; abreviação = falta de clareza
7. **Manter entidades pequenas** — máximo ~50 linhas por classe, ~10 linhas por método
8. **No máximo duas variáveis de instância por classe** — forçar decomposição e coesão
9. **Sem getters/setters** — comportamento deve estar no objeto que possui os dados; não expor estado raw

## Fluxo De Trabalho

### 1. Ler o \`contrato.yaml\` e classificar risco

Extrair do contrato, no mínimo:

- \`feature\`;
- \`description\`;
- \`rules\`;
- \`input\`;
- \`output\`;
- \`errors\`.

Também identificar, se existirem:

- eventos;
- integrações externas;
- restrições de compatibilidade;
- observações operacionais.

Se faltar informação essencial para implementar com segurança, interromper a execução e apontar exatamente o campo ausente ou ambíguo.

#### Classificação de Risco de Operações Destrutivas

**Keywords de detecção:** \`DROP\`, \`TRUNCATE\`, \`DELETE\` (sem WHERE), \`ALTER...DROP COLUMN\`, \`rm -rf\`, \`rmdir\`, \`unlink\` (path dinâmico), \`terraform destroy\`, \`kubectl delete\`, \`docker volume rm\`, \`migrate\` (schema), \`purge\`, \`wipe\`, \`--force\` em comando destrutivo, \`git push --force\`, \`git reset --hard\`

**Classificação de severidade:**

| Severidade | Exemplos |
|------------|----------|
| **CRITICAL** | DELETE-all / DROP / TRUNCATE sem guarda em tabelas de dados de usuário |
| **HIGH** | Migration sem DOWN, \`rm -rf\` com path variável, force flags em comandos destrutivos |
| **MEDIUM** | Migration sem rollback testado, cascade delete sem documentação de escopo |

**Quando detectada operação destrutiva, documentar obrigatoriamente as 5 medidas:**

| # | Medida | O que documentar |
|---|--------|-----------------|
| 1 | **Backup plan** | O que fazer backup e como verificar completude |
| 2 | **Rollback plan** | Procedimento de desfazer, testado em não-produção |
| 3 | **Blast radius** | Recursos afetados + escopo estimado + downtime |
| 4 | **Environment guard** | Bloqueado por env check ou confirmação de admin |
| 5 | **Preview / dry-run** | Output what-if, SQL diff, \`terraform plan\`, \`SELECT COUNT(*)\` antes do DELETE |

Severidade **CRITICAL** exige parar e confirmar com o usuário antes de prosseguir (HITL Gate).

### 2. Transformar contrato em checklist executável

Antes de codar, converter o contrato em itens verificáveis:

- regras de negócio que precisam existir no código;
- entradas que precisam ser validadas;
- saídas que precisam ser produzidas;
- erros que precisam ser retornados ou propagados;
- fluxos e efeitos colaterais esperados.

Nada deve ser implementado sem estar mapeado para um item concreto do contrato.

### 3. Planejar os testes a partir do contrato

Derivar os testes diretamente do \`contrato.yaml\`.

Cobrir no mínimo:

- cenário feliz;
- validações de input;
- regras de negócio;
- erros esperados;
- regressões prováveis;
- integrações afetadas, se houver.

Escolher o nível mais adequado para cada validação:

- unitário para regra isolada;
- integração para fluxo entre camadas;
- contrato para entradas e saídas estruturadas;
- E2E ou fluxo para comportamento ponta a ponta quando necessário.

### 4. Executar \`red -> green -> refactor\`

#### Red

- escrever primeiro os testes que representam o contrato;
- confirmar que falham pelo motivo correto;
- evitar testes genéricos que não provam o comportamento contratado.

#### Green

- implementar apenas o necessário para fazer os testes passarem;
- alterar o menor número possível de arquivos;
- manter nomes, fluxos e erros alinhados ao contrato.

#### Refactor

- simplificar o código depois dos testes verdes;
- remover duplicação e código provisório;
- preservar integralmente o comportamento validado.

### 5. Validar coerência final

Antes de concluir, conferir:

- toda regra do contrato existe em testes e código;
- todos os inputs esperados estão validados;
- todos os outputs esperados estão produzidos;
- todos os erros definidos estão tratados;
- a implementação não adicionou comportamento fora do contrato;
- os testes executados cobrem o que foi implementado.

## Formato Da Saída

Entregar a resposta em Markdown com esta estrutura mínima:

\`\`\`markdown
## Contrato executado

- Feature: \`create user\`
- Objetivo: implementar o cadastro de usuário com validação mínima e unicidade de e-mail
- Caminho do contrato: \`/specs/users/create-user.yaml\`
- Suposições: o repositório já possui infraestrutura de persistência e handler de erro padrão

## Contexto encontrado na codebase

- \`src/modules/users/controller.ts\` - endpoint de usuários
- \`src/modules/users/service.ts\` - regra de negócio do domínio
- \`src/modules/users/repository.ts\` - busca por e-mail existente
- \`tests/users/create-user.test.ts\` - padrão de testes do módulo
- \`src/shared/errors/AppError.ts\` - classe base para erros
- \`src/shared/container/index.ts\` - injeção de dependência
- \`src/database/typeorm/migrations/\` - migrations para users
- \`tests/utils/test-utils.ts\` - utilitários para mock
- \`tests/factories/users.factory.ts\` - factory para usuários
- \`jest.config.js\` - configuração de testes com coverage

## Implementação realizada

- **Testes**: sucesso, erro EMAIL_ALREADY_EXISTS, input inválido
- **Código**: validação de payload, verificação de unicidade, retorno conforme output do contrato
- **Alinhamento**: rules → validação/serviço, input → boundary, output → retorno, errors → tratamento

## Resultados dos testes

| Métrica | Valor |
|---------|-------|
| Total | 12 |
| Passed | 10 |
| Failed | 1 |
| Skipped | 1 |
| Coverage | statements 85%, branches 78%, functions 80%, lines 82% |

## Validação final

- Testes executados: \`npm test -- users/create-user\`
- Checks adicionais: lint do módulo
- Riscos residuais: cobertura E2E não adicionada
- Itens não realizados: nenhum
\`\`\`

## Regras Críticas

- Não implementar nada que não esteja sustentado pelo \`contrato.yaml\`.
- Não ignorar conflito entre contrato e comportamento atual; registrar e resolver de forma explícita.
- Não pular testes quando a feature altera comportamento verificável.
- Não reescrever arquitetura do projeto sem necessidade clara do contrato.
- Não commitar as alterações.
- Proibido usar \`any\` em qualquer ponto do código. Toda tipagem deve ser explícita e correta.
- Não usar workarounds ou gambiarras para contornar erros — resolver sempre a causa raiz.
- Não deixar código legado.

## Definição De Pronto

O trabalho está pronto quando:

1. o \`contrato.yaml\` tiver sido lido e convertido em checklist executável;
2. os testes representarem o comportamento contratado;
3. a implementação fizer os testes passarem;
4. o código final permanecer coerente com o contrato;
5. os riscos, suposições e limitações estiverem explícitos;
6. a documentação markdown da feature tiver seu checklist marcado como concluído.

### Marcação do Checklist da Documentação

Ao final da implementação, antes de finalizar o trabalho:

1. Localizar o arquivo de documentação markdown da feature (geralmente em \`docs/features/\` ou similar);
2. Encontrar a seção de checklist (itens com \`- [ ]\`);
3. Marcar todos os itens como concluídos alterando \`- [ ]\` para \`- [x]\`;
4. Se a documentação não existir, criar a estrutura básica de checklist baseada no contrato.`
