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

    // Adiciona a nova opção ao select de tipo
    const optionCartao = document.createElement('option');
    optionCartao.value = 'pago_cartao';
    optionCartao.textContent = 'Pago com Cartão de Crédito';
    tipoSelect.appendChild(optionCartao);

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
                const liSaida = document.createElement('li');
                liSaida.innerHTML = `
                    <span>${lancamento.descricao}: R$ ${parseFloat(lancamento.valor).toFixed(2)} (${lancamento.tipo === 'pago_cartao' ? 'Cartão' : lancamento.tipo === 'pagamento_fatura' ? 'Pg. Fatura' : 'Conta'})</span>
                    <button class="excluir-btn" data-index="${index}">🗑️</button>
                `;
                listaSaidas.appendChild(liSaida);
            }
        });

        document.querySelectorAll('.excluir-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                lancamentos.splice(index, 1);
                salvarLancamentos();
                exibirLancamentos();
                atualizarDashboard();
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

        atualizarGraficoPizza(totalEntradas, totalSaidasConta + totalGastosCartao + totalPagamentosFatura, limiteCartao + totalPagamentosFatura - totalGastosCartao);
    }

    function atualizarGraficoPizza(entradas, saidas, cartao) {
        const ctx = graficoPizzaCanvas.getContext('2d');
        const data = [entradas, saidas, Math.abs(cartao)];
        const labels = ['Entradas', 'Saídas', 'Cartão (Disponível)'];
        const colors = ['#28a745', '#dc3545', '#007bff'];

        new Chart(ctx, {
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
        const valor = document.getElementById('valor').value;
        const tipo = document.getElementById('tipo').value;

        if (tipo === 'pagamento_fatura') {
            // Registrar como saída do saldo geral
            lancamentos.push({ descricao: `Pg. Fatura: ${descricao}`, valor, tipo: 'saida' });
            // Atualizar o saldo disponível do cartão
            lancamentos.push({ descricao: `Crédito da Fatura: ${descricao}`, valor, tipo: 'pagamento_fatura', isCredit: true });
        } else {
            lancamentos.push({ descricao, valor, tipo });
        }

        salvarLancamentos();
        exibirLancamentos();
        atualizarDashboard();
        atualizarCartao();
        this.reset();
    });

    botaoLimiteCartao.addEventListener('click', () => {
        const novoLimite = parseFloat(prompt('Digite o limite total do cartão:'));
        if (!isNaN(novoLimite)) {
            limiteCartao = novoLimite;
            salvarLimiteCartao();
        } else {
            alert('Por favor, digite um valor válido para o limite.');
        }
    });

    // Inicialização
    if (!localStorage.getItem('limiteCartao')) {
        const limiteInicial = parseFloat(prompt('Bem-vindo! Digite o limite total do seu cartão de crédito:'));
        if (!isNaN(limiteInicial)) {
            limiteCartao = limiteInicial;
            salvarLimiteCartao();
        } else {
            alert('Você não definiu um limite para o cartão.');
        }
    } else {
        atualizarCartao();
    }

    exibirLancamentos();
    atualizarDashboard();
});
