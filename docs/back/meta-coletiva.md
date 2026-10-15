# Meta coletiva para rolês

Status: aberto

## Problema

Quem organiza um rolê que depende de um valor coletivo precisa acompanhar quanto os participantes pretendem contribuir em relação ao valor necessário. Sem esse acompanhamento, fica difícil avaliar se o plano continua viável e decidir o que fazer quando a data se aproxima sem a meta ter sido atingida.

## Comportamento

- Ao criar ou editar um rolê, o organizador pode ativar uma meta coletiva em reais (R$) e informar o valor necessário para o evento acontecer.
- Ao confirmar presença em um rolê com meta ativa, a pessoa pode informar quanto pretende contribuir. A contribuição não é obrigatória, exceto se o organizador definir um valor mínimo obrigatório.
- Todos que têm acesso ao rolê podem ver o valor da meta e o progresso agregado. Somente o organizador e a própria pessoa participante podem ver o valor individual informado por essa pessoa.
- As contribuições são informativas e servem para planejamento manual. O sistema não recebe, movimenta nem confirma pagamentos ou transferências.
- O progresso considera as contribuições informadas por participantes com presença confirmada. Se alguém cancelar a participação, sua contribuição deixa de compor o total.
- A pessoa participante pode alterar o valor informado. A alteração fica registrada no histórico.
- Dois dias antes da data do rolê, se o total informado estiver abaixo da meta, o sistema notifica o organizador e solicita uma decisão. As opções são cancelar o rolê, adiar para outra data ou manter o rolê com o total informado.
- Se o organizador não decidir dentro do prazo, o rolê é cancelado automaticamente.
- Se a meta for atingida enquanto a decisão estiver pendente, o rolê prossegue e a solicitação de decisão é encerrada.
- Ao adiar, a meta e as contribuições existentes continuam válidas. O acompanhamento permanece aberto se o organizador escolher manter o rolê mesmo sem atingir a meta.
- As alterações de contribuição e as decisões do organizador ficam registradas em histórico. A visualização dos valores individuais segue a regra de privacidade acima; o histórico das decisões do organizador pode ser visto por quem tem acesso ao rolê.

## Contrato

- A API deve permitir criar, consultar e atualizar a meta coletiva de um rolê, registrar ou alterar a contribuição informada na participação, cancelar uma participação e registrar a decisão do organizador.
- O progresso deve ser calculado com as contribuições que contam para a meta; participações canceladas não entram no total.
- A decisão de adiar deve incluir uma nova data. Meta, contribuições e histórico existentes são preservados ao adiar.
- A API deve distinguir ausência de contribuição informada de uma contribuição com valor zero, caso zero seja permitido pela regra de valor mínimo.
- Nomes de rotas, formato final dos dados, limites mínimo e máximo e horário exato dos prazos ficam para definição no planejamento técnico.

## Segurança

- Apenas uma pessoa autenticada pode criar ou alterar a própria participação e contribuição.
- Somente o organizador do rolê pode configurar a meta e decidir entre cancelar, adiar ou manter.
- O valor individual só pode ser retornado ao organizador e à própria pessoa participante. Para as demais pessoas autorizadas a acessar o rolê, a API retorna apenas o progresso agregado.
- A autorização deve respeitar as regras de acesso já aplicadas ao rolê; conhecer seu identificador não deve permitir consultar ou alterar dados sem permissão.
- A API e a interface não podem afirmar que uma contribuição foi paga, recebida ou verificada.

## Fora de escopo

- Processar pagamentos, transferências ou reembolsos.
- Confirmar automaticamente pagamentos ou consultar contas bancárias.
- Refazer a identidade visual do produto ou definir o design final das telas.
- Implementar a funcionalidade nesta etapa de documentação.

## Critério de pronto

- A meta é expressa em reais e pode ter um valor mínimo de contribuição definido pelo organizador.
- A confirmação de presença funciona sem contribuição quando não houver mínimo obrigatório.
- O cálculo exclui contribuições de participações canceladas e o progresso agregado é visível a quem tem acesso ao rolê.
- O valor individual fica restrito ao organizador e à pessoa que o informou.
- Dois dias antes do rolê, uma meta não atingida gera uma decisão pendente para o organizador; as três opções e o cancelamento automático por falta de decisão estão descritos.
- Atingir a meta enquanto a decisão estiver pendente encerra a solicitação e permite que o rolê prossiga.
- Adiar preserva a meta e as contribuições; manter deixa o acompanhamento aberto.
- Alterações de contribuição e decisões são registradas sem expor valores individuais a quem não tem permissão.
- Os casos de meta abaixo, igual ou acima do alvo, alteração, cancelamento de participação, adiamento, manutenção e falta de decisão poderão ser verificados por testes na implementação.

## Decisões pendentes

- O organizador pode exigir um valor mínimo, mas ainda é preciso definir se esse mínimo pode ser zero e quais limites mínimo e máximo se aplicam.
- Qual é o horário e o fuso usados para o aviso de dois dias antes e para o cancelamento automático se não houver decisão?
- A contribuição pode ser alterada em qualquer estado do rolê, mas ainda é preciso definir se isso inclui participação cancelada ou rolê já encerrado. Participações canceladas continuam fora do cálculo.
- Ao adiar, os prazos de notificação e decisão passam a ser calculados em relação à nova data? (A regra proposta é recalculá-los.)
