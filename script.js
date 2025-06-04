document.addEventListener('DOMContentLoaded', () => {
    const formLancamento = document.getElementById('form-lancamento');
    const listaEntradas = document.getElementById('lista-entradas');
    const listaSaidas = document.getElementById('lista-saidas');
    const cartaoCreditoDiv = document.getElementById('cartao-credito');
    const limiteTotalSpan = document.getElementById('limite-total');
    const gastoAtualCartaoSpan = document.getElementById('gasto-atual-cartao');
    const disponivelCartaoSpan = document.getElementById('disponivel-cartao');
    const saldoGeralSpan = document.getElementById('saldo-geral');
    const saldoDisponivelCartaoSpan = document.getElementById('saldo-disponivel-cartao');
    const graficoPizzaCanvas = document.getElementById('grafico-pizza');
    const botaoLimiteCartao = document.getElementById('botao-limite-cartao');
    const tipoSelect = document.getElementById('tipo');

    let lancamentos = JSON.parse(localStorage.getItem('lancamentos')) || [];
    let limiteCartao = parseFloat(localStorage.getItem('limiteCartao')) || 0;
    
    // Variável para armazenar a instância do gráfico
    let graficoPizza = null;

    function atualizarCartao() {
        let pagamentosFatura = lancamentos
            .filter(lancamento => lancamento.tipo === 'pagamento_fatura')
            .reduce((total, lancamento) => total + parseFloat(lancamento.valor), 0);

        let gastosCartao = lancamentos
            .filter(lancamento => lancamento.tipo === 'pago_cartao')
            .reduce((total, lancamento) => total + parseFloat(lancamento.valor), 0);

        limiteTotalSpan.textContent = `R$ ${limiteCartao.toFixed(2)}`;
        gastoAtualCartaoSpan.textContent = `R$ ${gastosCartao.toFixed(2)}`;
        disponivelCartaoSpan.textContent = `R$ ${(limiteCartao + pagamentosFatura - gastosCartao).toFixed(2)}`;
    }

    function salvarLancamentos() {
        localStorage.setItem('lancamentos', JSON.stringify(lancamentos));
    }

    function salvarLimiteCartao() {
        localStorage.setItem('limiteCartao', limiteCartao);
        atualizarCartao();
        atualizarDashboard();
    }

    function exibirLancamentos() {
        listaEntradas.innerHTML = '';
        listaSaidas.innerHTML = '';

        lancamentos.forEach((lancamento, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${lancamento.descricao}: R$ ${parseFloat(lancamento.valor).toFixed(2)}</span>
                <button class="excluir-btn" data-index="${index}">🗑️</button>
            `;
            
            if (lancamento.tipo === 'entrada') {
                listaEntradas.appendChild(li);
            } else if (lancamento.tipo === 'saida' || lancamento.tipo === 'pago_cartao' || lancamento.tipo === 'pagamento_fatura') {
                const tipoExibicao = lancamento.tipo === 'pago_cartao' ? 'Cartão' : 
                                    lancamento.tipo === 'pagamento_fatura' ? 'Pg. Fatura' : 'Conta';
                
                li.innerHTML = `
                    <span>${lancamento.descricao}: R$ ${parseFloat(lancamento.valor).toFixed(2)} (${tipoExibicao})</span>
                    <button class="excluir-btn" data-index="${index}">🗑️</button>
                `;
                listaSaidas.appendChild(li);
            }
        });

        // Adiciona eventos de clique aos botões de exclusão
        adicionarEventosExclusao();
    }
    
    function adicionarEventosExclusao() {
        document.querySelectorAll('.excluir-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                lancamentos.splice(index, 1);
                salvarLancamentos();
                exibirLancamentos();
                atualizarDashboard();
                atualizarCartao();
            });
        });
    }

    function atualizarDashboard() {
        const totalEntradas = lancamentos
            .filter(lancamento => lancamento.tipo === 'entrada')
            .reduce((total, lancamento) => total + parseFloat(lancamento.valor), 0);

        const totalSaidasConta = lancamentos
            .filter(lancamento => lancamento.tipo === 'saida')
            .reduce((total, lancamento) => total + parseFloat(lancamento.valor), 0);

        const totalPagamentosFatura = lancamentos
            .filter(lancamento => lancamento.tipo === 'pagamento_fatura')
            .reduce((total, lancamento) => total + parseFloat(lancamento.valor), 0);

        const totalGastosCartao = lancamentos
            .filter(lancamento => lancamento.tipo === 'pago_cartao')
            .reduce((total, lancamento) => total + parseFloat(lancamento.valor), 0);

        saldoGeralSpan.textContent = `R$ ${(totalEntradas - totalSaidasConta - totalPagamentosFatura).toFixed(2)}`;
        saldoDisponivelCartaoSpan.textContent = `R$ ${(limiteCartao + totalPagamentosFatura - totalGastosCartao).toFixed(2)}`;

        atualizarGraficoPizza(totalEntradas, totalSaidasConta + totalPagamentosFatura, limiteCartao + totalPagamentosFatura - totalGastosCartao);
    }

    function atualizarGraficoPizza(entradas, saidas, cartao) {
        const ctx = graficoPizzaCanvas.getContext('2d');
        const data = [entradas, saidas, Math.max(0, cartao)]; // Garantir que o valor do cartão não seja negativo no gráfico
        const labels = ['Entradas', 'Saídas', 'Cartão (Disponível)'];
        const colors = ['#28a745', '#dc3545', '#007bff'];

        // Destruir o gráfico anterior se existir
        if (graficoPizza) {
            graficoPizza.destroy();
        }

        graficoPizza = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    formLancamento.addEventListener('submit', function(e) {
        e.preventDefault();
        const descricao = document.getElementById('descricao').value;
        const valor = parseFloat(document.getElementById('valor').value);
        const tipo = document.getElementById('tipo').value;

        if (tipo === 'pagamento_fatura') {
            // Registrar como saída do saldo geral
            lancamentos.push({ 
                descricao: `Pg. Fatura: ${descricao}`, 
                valor: valor, 
                tipo: 'pagamento_fatura'
            });
        } else {
            lancamentos.push({ 
                descricao, 
                valor: valor, 
                tipo 
            });
        }

        salvarLancamentos();
        exibirLancamentos();
        atualizarDashboard();
        atualizarCartao();
        this.reset();
    });

    botaoLimiteCartao.addEventListener('click', () => {
        const novoLimite = parseFloat(prompt('Digite o limite total do cartão:'));
        if (!isNaN(novoLimite) && novoLimite >= 0) {
            limiteCartao = novoLimite;
            salvarLimiteCartao();
        } else {
            alert('Por favor, digite um valor válido para o limite.');
        }
    });

    // Inicialização
    if (!localStorage.getItem('limiteCartao')) {
        setTimeout(() => {
            const limiteInicial = parseFloat(prompt('Bem-vindo! Digite o limite total do seu cartão de crédito:'));
            if (!isNaN(limiteInicial) && limiteInicial >= 0) {
                limiteCartao = limiteInicial;
                salvarLimiteCartao();
            } else {
                alert('Você não definiu um limite válido para o cartão. Usando valor padrão de 0.');
                limiteCartao = 0;
                salvarLimiteCartao();
            }
        }, 500); // Pequeno atraso para garantir que a página esteja completamente carregada
    }

    // Adicionar opção de pagamento com cartão ao select
    const optionCartao = document.createElement('option');
    optionCartao.value = 'pago_cartao';
    optionCartao.textContent = 'Pago com Cartão de Crédito';
    tipoSelect.appendChild(optionCartao);

    exibirLancamentos();
    atualizarDashboard();
    atualizarCartao();
});
