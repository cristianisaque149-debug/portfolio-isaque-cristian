# ⚔️ Batalha de Modelos & Engenharia de Prompt (XML)

## 📝 Descrição do Projeto
[cite_start]Este projeto consiste em um experimento comparativo para avaliar a eficácia de diferentes modelos de Inteligência Artificial na interpretação de **Prompts Estruturados em XML**[cite: 3, 8]. [cite_start]O desafio central foi gerar uma página HTML *Single Page* com CSS integrado voltada para o setor **Hospitalar**, seguindo diretrizes rígidas de design e funcionalidades obrigatórias[cite: 8, 10].

[cite_start]Desenvolvido como parte da disciplina de **Engenharia de Prompt e Aplicações em IA (2024.1)** [cite: 2, 13][cite_start], o trabalho permitiu analisar como cada modelo processa instruções técnicas, lida com a criatividade e gerencia a eficiência de tokens para entregar um produto final funcional[cite: 9, 14].

## 🚀 O Prompt Estruturado (Input)
[cite_start]A técnica utilizada baseou-se na delimitação de instruções por tags XML para separar claramente os objetivos das restrições técnicas[cite: 8, 10]:

```xml
<tarefa>
  <objetivo>Criar uma página HTML5 única com CSS3 interno (single page).</objetivo>
  <tema> Hospitalar</tema>
  <diretrizes_design>
    <layout>Responsivo e minimalista.</layout>
    <paleta_cores> branco e preto</paleta_cores>
    <tipografia>Sans-serif para títulos, Serif para corpo.</tipografia>
  </diretrizes_design>
  <obrigatoriedades_tecnicas>
    <item>Menu de navegação funcional (âncoras).</item>
    <item>Seção de portfólio ou galeria.</item>
    <item>Rodapé com informações de contato simuladas.</item>
    <item>tela de login</item>
  </obrigatoriedades_tecnicas>
  <metrica_obrigatoria>
    Ao final da resposta, informe uma estimativa de quantos tokens foram gerados para este código.
  </metrica_obrigatoria>
</tarefa>
