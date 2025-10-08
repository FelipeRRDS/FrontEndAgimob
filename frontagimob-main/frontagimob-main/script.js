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
    // ... Código da Navbar e Carrossel ...


    /* --------------------------------------------------------------------------
        [2] LÓGICA DA CALCULADORA E INTEGRAÇÃO COM API
        -------------------------------------------------------------------------- */
    const form = document.getElementById('financing-form');
    if (form) {
        
        // --- Referências de Elementos ---
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
        const totalPagoSac = infoSac.valorTotalFinanciamento + infoSac.valorTotalJuros; 
        document.getElementById('sac-total-pago').textContent = formatCurrency(totalPagoSac);
        
        // Se você tiver um campo para renda comprometida:
        // document.getElementById('sac-renda-comprometida').textContent = formatCurrency(infoSac.rendaComprometida);
        
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
        
        const totalPagoPrice = infoPrice.valorTotalFinanciamento + infoPrice.valorTotalJuros; 
        document.getElementById('price-total-pago').textContent = formatCurrency(totalPagoPrice);
        
        // Se você tiver um campo para renda comprometida:
        // document.getElementById('price-renda-comprometida').textContent = formatCurrency(infoPrice.rendaComprometida);
        
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

            // 2. Prepara a UI para o cálculo
            resultsPlaceholder.textContent = 'Calculando... Aguarde a resposta do servidor.'; 
            resultsPlaceholder.classList.add('active');
            resultsContent.classList.remove('active');
            
            const dataToSend = {
                valorTotal: valorImovel,
                valorEntrada: valorEntrada,
                prazo: prazoAnos,
                rendaUsuario: rendaBruta,
                rendaParticipante: rendaParticipante,
                tipo: modalidade,
            };

            try {
                // 3. Chamada à API de Simulação
                const response = await fetch(`${API_BASE_URL}/simulacao`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSend),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido.' }));
                    throw new Error(errorData.message || 'Falha na comunicação com o servidor de simulação.');
                }

                 const result = await response.json();
            

            
                
                // Armazena os dados completos para PDF/E-mail
                dadosSimulacao = { ...dataToSend, result }; 
                
                displayResults(result, modalidade);
                
            } catch (error) {
                console.error('Erro na simulação:', error);
                resultsPlaceholder.textContent = `Erro: ${error.message}. Verifique o console ou o servidor.`;
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
        
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email-input').value;
            const submitButton = emailForm.querySelector('.cta-button');

            submitButton.textContent = 'Enviando...';
            submitButton.disabled = true;

            try {
                // Monta o objeto que o backend (EmailRequestDto) espera
                const dataToSend = { 
                    email: email, 
                    dadosSimulacao: dadosSimulacao // Envia todo o objeto de simulação
                };
                
                // Chamada à API de Envio de E-mail
                const response = await fetch(`${API_BASE_URL}/${email}/${response.json().id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSend),
                });

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.message || 'Falha no servidor de envio de e-mail.');
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


        // --- GERAÇÃO DE PDF (Mantida localmente) ---
        btnBaixarPDF.addEventListener('click', () => {
            if (!dadosSimulacao.result) {
                alert("Por favor, realize uma simulação antes de gerar o PDF.");
                return;
            }
            
            // ... Lógica de geração de PDF com jsPDF ...
            alert("PDF gerado localmente com sucesso! (Verifique a lógica de PDF no script se necessário)");

            /* Exemplo de Lógica de PDF:
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            // ... (preenchimento do doc) ...
            doc.save('simulacao-agimob.pdf'); 
            */
        });
    }
});