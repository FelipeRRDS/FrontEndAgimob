/* ==========================================================================
    ARQUIVO DE SCRIPTS - AGIMOB (Versão FINAL Integrada com API)
    ==========================================================================
    Autor: Gemini (para Kai)
    Descrição: Versão completa com Navbar, Carrossel e Calculadora integrada,
    chamando os endpoints /api/simulacao e /api/enviar-email.
    ========================================================================== */
'use strict';

// ======================================================================
// CONFIGURAÇÃO DA API - AJUSTE A URL ABAIXO PARA O SEU BACK-END REAL
// ======================================================================
// Use a URL base do seu Controller Spring Boot (ex: /api)
const API_BASE_URL = 'http://localhost:8080/agimob'; 
// Se você está usando a porta 8080 do Spring, mude para 'http://localhost:8080/api'
// ======================================================================

// Variável global para armazenar os dados do formulário e o resultado da API
let dadosSimulacao = {};



// Função auxiliar para converter string formatada (R$ 1.000) para número (1000)
const parseCurrency = (value) => {
    if (typeof value === 'string') {
        // Remove . e , para converter corretamente
        return parseFloat(value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
    }
    return 0;
};

// Formata um número para o padrão monetário brasileiro (R$ 1.000,00)
const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return 'R$ 0,00';
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};


document.addEventListener('DOMContentLoaded', () => {

    /* --------------------------------------------------------------------------
        [1] LÓGICA DA NAVBAR & CARROSSEL (Códigos de layout omitidos por brevidade)
        -------------------------------------------------------------------------- */
    /* --------------------------------------------------------------------------
   [1] LÓGICA DA NAVBAR & CARROSSEL
   -------------------------------------------------------------------------- */
const track = document.getElementById('carousel-track');
const slides = Array.from(track.children);
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const paginationContainer = document.getElementById('carousel-pagination');
const dots = Array.from(paginationContainer.children);

let slideIndex = 0; // Índice inicial

// Função que move o carrossel (ajustando a tradução CSS)
const moveSlide = (index) => {
    track.style.transform = 'translateX(-' + index * slides[0].offsetWidth + 'px)';
    slideIndex = index;
    updateButtons();
    updatePagination();
};

// Atualiza o estado dos botões (disabled)
const updateButtons = () => {
    prevButton.disabled = slideIndex === 0;
    nextButton.disabled = slideIndex === slides.length - 1;
};

// Atualiza os pontos de paginação
const updatePagination = () => {
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === slideIndex);
    });
};

// Event Listeners para navegação
prevButton.addEventListener('click', () => {
    if (slideIndex > 0) {
        moveSlide(slideIndex - 1);
    }
});

nextButton.addEventListener('click', () => {
    if (slideIndex < slides.length - 1) {
        moveSlide(slideIndex + 1);
    }
});

// Inicialização
moveSlide(0); 

// (Opcional: Adicionar lógica para ajustar ao redimensionar a tela)
// window.addEventListener('resize', () => moveSlide(slideIndex));


    /* --------------------------------------------------------------------------
        [2] LÓGICA DA CALCULADORA E INTEGRAÇÃO COM API
        -------------------------------------------------------------------------- */
    const form = document.getElementById('financing-form');
    if (form) {
        
        // --- Referências de Elementos ---
        const checkboxAgi = document.getElementById('sou-cliente-agi');
        const cpfContainer = document.getElementById('cpf-container');
        const cpfInput = document.getElementById('cpf-usuario');

        const incluirParticipanteCheckbox = document.getElementById('incluir-participante');
        const conjugeField = document.querySelector('.conjuge-field');
        const resultadoDiv = document.getElementById('resultado-simulacao');
        const resultsPlaceholder = resultadoDiv.querySelector('.results-placeholder');
        const resultsContent = resultadoDiv.querySelector('.results-content');
        const resultadoSAC = document.getElementById('resultado-sac');
        const resultadoPrice = document.getElementById('resultado-price');
        const btnBaixarPDF = document.getElementById('btn-baixar-pdf');
        const btnEnviarEmail = document.getElementById('btn-enviar-email');
        const emailPopup = document.getElementById('email-popup');
        const emailForm = document.getElementById('email-form');
        const popupCloseBtn = document.querySelector('.popup-close');

        // Função para formatar um número como porcentagem (ex: 0.3 vira 30%)
    const formatPercentage = (value) => {
    let numericValue = Number(value) || 0; 
    
    // Se o backend enviar a porcentagem como 30 (ao invés de 0.3), 
    // a formatação abaixo pode precisar de ajuste. Assumimos que é decimal (ex: 0.3)
    return numericValue.toLocaleString('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 1, // Ex: 30.0%
        maximumFractionDigits: 2  // Ex: 30.00%
    });
};

    checkboxAgi.addEventListener('change', () => {
        if (checkboxAgi.checked) {
        // Se marcado, remove a classe 'hidden' para mostrar o container
         cpfContainer.classList.remove('hidden');
            cpfInput.setAttribute('required', 'required'); // O CPF se torna obrigatório
        // Adicione aqui uma máscara de CPF (opcional, mas recomendado)
    } else {
        // Se desmarcado, adiciona a classe 'hidden' para esconder o container
        cpfContainer.classList.add('hidden');
        cpfInput.removeAttribute('required'); // Remove a obrigatoriedade
        cpfInput.value = ''; // Limpa o campo
    }
});

        
        // --- FORMATAÇÃO AUTOMÁTICA DE INPUTS DE VALOR ---
        const formatCurrencyInput = (input) => {
            let value = input.value.replace(/\D/g, '');
            if (value === '') { input.value = ''; return; }
            input.value = new Intl.NumberFormat('pt-BR').format(value);
        };
        document.querySelectorAll('#valor-imovel, #valor-entrada, #renda-bruta, #renda-conjuge').forEach(input => {
            input.addEventListener('input', () => formatCurrencyInput(input));
        });

        // --- TOGGLE DO CAMPO DE RENDA DO PARTICIPANTE ---
        incluirParticipanteCheckbox.addEventListener('change', () => {
            conjugeField.classList.toggle('hidden');
        });


        // NO SEU script.js, substitua a função displayResults (linhas ~165 a ~195)

// --- FUNÇÃO CORRIGIDA PARA EXIBIR RESULTADOS DA API ---
const displayResults = (result, modalidade) => {
    resultsPlaceholder.classList.remove('active');
    resultsContent.classList.add('active');
    
    // O backend retorna as informações de resumo em diferentes campos, dependendo do tipo de simulação:
    const infoSac = result.informacoesAdicionaisSac || result.informacoesAdicionais;
    const infoPrice = result.informacoesAdicionaisPrice || result.informacoesAdicionais;
    
    // Checagem de exibição
    const showSAC = modalidade.includes('SAC') && infoSac;
    const showPRICE = modalidade.includes('PRICE') && infoPrice;

    // Preenchendo o SAC
    if (showSAC) {
        // Usamos o objeto infoSac (que é o seu InformacoesAdicionaisDto)
        document.getElementById('sac-primeira-parcela').textContent = formatCurrency(infoSac.primeiraParcela);
        document.getElementById('sac-ultima-parcela').textContent = formatCurrency(infoSac.ultimaParcela);
        document.getElementById('sac-total-juros').textContent = formatCurrency(infoSac.valorTotalJuros);
        
        // O valorTotalFinanciamento no DTO é o principal + juros. Se for apenas o principal, ajuste aqui:
        document.getElementById('sac-total-pago').textContent = formatCurrency(infoSac.valorTotalFinanciamento);
        
        // Se você tiver um campo para renda comprometida:
        document.getElementById('sac-renda-comprometida').textContent = formatPercentage(infoSac.rendaComprometida);
        
        resultadoSAC.style.display = 'block';
    } else {
        resultadoSAC.style.display = 'none';
    }

    // Preenchendo o PRICE
    if (showPRICE) {
        // Usamos o objeto infoPrice
        // A Parcela Fixa será a primeira parcela (pois em PRICE todas são iguais)
        const parcelaFixa = infoPrice.primeiraParcela; 
        
        document.getElementById('price-parcela-fixa').textContent = formatCurrency(parcelaFixa);
        document.getElementById('price-total-juros').textContent = formatCurrency(infoPrice.valorTotalJuros);
        document.getElementById('price-total-pago').textContent = formatCurrency(infoPrice.valorTotalFinanciamento);
        document.getElementById('price-renda-comprometida').textContent = formatPercentage(infoPrice.rendaComprometida);
        
        resultadoPrice.style.display = 'block';
    } else {
        resultadoPrice.style.display = 'none';
    }
};


        // --- [CONEXÃO API] SUBMISSÃO DO FORMULÁRIO: CHAMA /api/simulacao ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. Coleta e sanitiza os dados do formulário
    const valorImovel = parseCurrency(document.getElementById('valor-imovel').value);
    const valorEntrada = parseCurrency(document.getElementById('valor-entrada').value);
    const prazoAnos = parseInt(document.getElementById('prazo-anos').value) || 0;
    const rendaBruta = parseCurrency(document.getElementById('renda-bruta').value);
    const incluirParticipante = document.getElementById('incluir-participante').checked;
    const rendaParticipante = incluirParticipante 
        ? parseCurrency(document.getElementById('renda-conjuge').value) 
        : 0;
    const modalidade = document.getElementById('modalidade').value.toUpperCase();
    const cpf = document.getElementById('cpf-usuario').value;
    const isClienteAgi = document.getElementById('sou-cliente-agi').checked;

    // 2. Prepara a UI para o cálculo
    resultsPlaceholder.textContent = 'Calculando... Aguarde a resposta do servidor.'; 
    resultsPlaceholder.classList.add('active');
    resultsContent.classList.remove('active');
    
    const dataToSend = {
        cpfUsuario: isClienteAgi ? cpf : null,
        valorTotal: valorImovel,
        valorEntrada: valorEntrada,
        prazo: prazoAnos,
        rendaUsuario: rendaBruta,
        rendaParticipante: rendaParticipante,
        tipo: modalidade,
    };
    
    // Variável para armazenar o resultado em caso de erro no response.json()
    let result = null; 

    try {
        // 3. Chamada à API de Simulação
        const response = await fetch(`${API_BASE_URL}/simulacao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
        });
        
        // Tenta ler o corpo JSON. Isso funcionará para sucesso (200) e erro com corpo JSON (4xx)
        result = await response.json().catch(() => ({})); 

        if (!response.ok) {
            // Se a resposta não for OK (4xx, 5xx), lança o erro usando a mensagem do corpo JSON, se existir
            throw new Error(result.message || result.error || 'Falha na comunicação com o servidor de simulação.');
        }

        // Armazena os dados completos para PDF/E-mail (agora 'result' existe e é válido)
        dadosSimulacao = { ...dataToSend, result }; 
        
        displayResults(result, modalidade);
        
    } catch (error) {
        console.error('Erro na simulação:', error);
        
        // Exibe a mensagem de erro da exceção lançada
        const errorMessage = error.message || 'Erro desconhecido durante a simulação.';

        resultsPlaceholder.textContent = `Erro: ${errorMessage}. Verifique o console.`;
        resultsPlaceholder.classList.add('active');
        resultsContent.classList.remove('active');
    }
});
        // --- POPUP E ENVIO DE E-MAIL: CHAMA /api/enviar-email ---
        const togglePopup = () => emailPopup.classList.toggle('active');
        btnEnviarEmail.addEventListener('click', () => {
             if (!dadosSimulacao.result) {
                 alert("Por favor, realize uma simulação antes de enviar por e-mail.");
                 return;
            }
            togglePopup();
        });
        popupCloseBtn.addEventListener('click', togglePopup);
        emailPopup.addEventListener('click', (e) => { if (e.target === emailPopup) togglePopup(); });
        
        // --- POPUP E ENVIO DE E-MAIL: CHAMA /agimob/simulacao/enviarSimulacao ---
// (Mantenha o código de togglePopup e listeners do botão)
// ...

emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-input').value;
    const submitButton = emailForm.querySelector('.cta-button');

    // 1. **VERIFICAÇÃO CRÍTICA DO ID**
    // O ID deve estar salvo no objeto dadosSimulacao da chamada anterior
    const simulacaoId = dadosSimulacao.result?.id; // Tenta obter o ID do resultado
    
    if (!simulacaoId) {
        alert("Erro: O ID da simulação não foi encontrado. Por favor, refaça a simulação.");
        return;
    }
    
    submitButton.textContent = 'Enviando...';
    submitButton.disabled = true;

    try {
        // A URL COMPLETA E CORRETA, usando a rota do seu SimulacaoController:
        const url = `${API_BASE_URL}/simulacao/enviarSimulacao/${email}/${simulacaoId}`;
        
        // Chamada à API de Envio de E-mail (Seu endpoint usa POST com Path Variables)
        const response = await fetch(url, {
            method: 'POST',
            // O body não é necessário, pois seu backend usa Path Variables. 
            // Se ele esperasse um JSON, o body deveria ser adicionado.
            // body: JSON.stringify({ email: email, simulacaoId: simulacaoId }),
            headers: { 'Content-Type': 'application/json' },
        });
        
        // Se o seu backend retorna 200 OK sem corpo (ResponseEntity<Void>), este bloco é suficiente.
        if (!response.ok) {
            // Tenta ler o erro do corpo, se houver
            const errorBody = await response.text().catch(() => 'Erro desconhecido.');
            throw new Error(`Falha: ${response.status} - ${errorBody}`);
        }

        alert(`Simulação enviada com sucesso para ${email}!`);
        togglePopup();
        emailForm.reset();

    } catch (error) {
        console.error('Erro no envio de e-mail:', error);
        alert(`Falha ao enviar e-mail: ${error.message}`);
    } finally {
        submitButton.textContent = 'Enviar';
        submitButton.disabled = false;
    }
});
            
           // ...
// --- GERAÇÃO DE PDF (Chamada API do Backend) ---
btnBaixarPDF.addEventListener('click', async () => {
    const simulacaoId = dadosSimulacao.result?.id; // Tenta obter o ID do resultado
    
    if (!simulacaoId) {
        alert("Por favor, realize uma simulação antes de gerar o PDF.");
        return;
    }

    try {
        // ASSUMINDO QUE O ENDPOINT SEJA /agimob/pdf/gerar/{id}
        const response = await fetch(`${API_BASE_URL}/simulacao/baixarSimulacao/${simulacaoId}`, {
            method: 'POST' 
        });

        if (!response.ok) {
            alert(`Falha ao gerar PDF: ${response.statusText}`);
            return;
        }

        // O backend deve retornar o PDF como um Blob
        const blob = await response.blob();
        
        // Lógica para forçar o download no navegador
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = `simulacao_agimob_${simulacaoId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(urlBlob);

        alert("PDF gerado e download iniciado com sucesso!");

    } catch (error) {
        console.error('Erro ao baixar PDF:', error);
        alert("Erro de rede ao tentar baixar o PDF.");
    }
});
    }});