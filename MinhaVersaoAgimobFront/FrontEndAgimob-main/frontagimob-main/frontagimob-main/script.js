'use strict';

const API_BASE_URL = 'http://localhost:8080/agimob';
let dadosSimulacao = {};

// ======================================================================
// FUNÇÕES AUXILIARES
// ======================================================================
const parseCurrency = (value) => {
    if (typeof value === 'string') {
        return parseFloat(value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
    }
    return 0;
};

const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatarPorcentagem = (valor) => {
    if (valor == null || isNaN(valor)) return '-';
    
    // Se o valor for 10, 50 ou 3000, ajusta para proporção
    const ajustado = valor

    return ajustado.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};


// ======================================================================
// DOMContentLoaded
// ======================================================================
document.addEventListener('DOMContentLoaded', () => {

    // -------------------- CARROSSEL --------------------
    const track = document.getElementById('carousel-track');
    const slides = Array.from(track.children);
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const paginationContainer = document.getElementById('carousel-pagination');
    const dots = Array.from(paginationContainer.children);

    let slideIndex = 0;
    const moveSlide = (index) => {
        track.style.transform = 'translateX(-' + index * slides[0].offsetWidth + 'px)';
        slideIndex = index;
        prevButton.disabled = slideIndex === 0;
        nextButton.disabled = slideIndex === slides.length - 1;
        dots.forEach((dot, i) => dot.classList.toggle('active', i === slideIndex));
    };
    prevButton.addEventListener('click', () => { if (slideIndex > 0) moveSlide(slideIndex - 1); });
    nextButton.addEventListener('click', () => { if (slideIndex < slides.length - 1) moveSlide(slideIndex + 1); });
    moveSlide(0);

    // -------------------- FORMULÁRIO --------------------
    const form = document.getElementById('financing-form');
    if (!form) return;

    const checkboxAgi = document.getElementById('sou-cliente-agi');
    const cpfContainer = document.getElementById('cpf-container');
    const cpfInput = document.getElementById('cpf-usuario');
    const incluirParticipanteCheckbox = document.getElementById('incluir-participante');
    const conjugeField = document.querySelector('.conjuge-field');

    const resultadoDiv = document.getElementById('resultado-simulacao');
    const resultsPlaceholder = resultadoDiv.querySelector('.results-placeholder');
    const resultsContent = resultadoDiv.querySelector('.results-content');
    const resultadoSAC = document.getElementById('resultado-sac');
    const resultadoSacClienteAgi = document.getElementById('resultado-sac-clienteAgi');
    const resultadoPrice = document.getElementById('resultado-price');
    const resultadoPriceClienteAgi = document.getElementById('resultado-price-clienteAgi');

    const btnBaixarPDF = document.getElementById('btn-baixar-pdf');
    const btnEnviarEmail = document.getElementById('btn-enviar-email');
    const emailPopup = document.getElementById('email-popup');
    const emailForm = document.getElementById('email-form');
    const popupCloseBtn = document.querySelector('.popup-close');

    // -------------------- TOGGLE CPF / PARTICIPANTE --------------------
    checkboxAgi.addEventListener('change', () => {
        if (checkboxAgi.checked) {
            cpfContainer.classList.remove('hidden');
            cpfInput.setAttribute('required', 'required');
        } else {
            cpfContainer.classList.add('hidden');
            cpfInput.removeAttribute('required');
            cpfInput.value = '';
        }
    });

    incluirParticipanteCheckbox.addEventListener('change', () => {
        if (incluirParticipanteCheckbox.checked) {
            conjugeField.classList.remove('hidden');
            document.getElementById('renda-conjuge').setAttribute('required', 'required');
        } else {
            conjugeField.classList.add('hidden');
            document.getElementById('renda-conjuge').removeAttribute('required');
            document.getElementById('renda-conjuge').value = '';
        }
    });

    // -------------------- FORMATAR INPUTS --------------------
    const formatCurrencyInput = (input) => {
        let value = input.value.replace(/\D/g, '');
        if (!value) { input.value = ''; return; }
        input.value = new Intl.NumberFormat('pt-BR').format(value);
    };
    document.querySelectorAll('#valor-imovel, #valor-entrada, #renda-bruta, #renda-conjuge')
        .forEach(input => input.addEventListener('input', () => formatCurrencyInput(input)));

    // ======================================================================
    // EXIBIR RESULTADOS
    // ======================================================================
    const displayResults = (result, modalidade) => {
    resultsPlaceholder.classList.remove('active');
    resultsContent.classList.add('active');

    const infoSac = result.sac?.informacoesAdicionais || null;
    const infoPrice = result.price?.informacoesAdicionais || null;
    const infoClienteAgiSac = result.sac?.informacoesAdicionaisClienteAgi || null;
    const infoClienteAgiPrice = result.price?.informacoesAdicionaisClienteAgi || null;

    // Mostrar SAC
    if ((modalidade === 'SAC' || modalidade === "AMBOS") && infoSac && infoClienteAgiSac == null) {
        document.getElementById('sac-primeira-parcela').textContent = formatCurrency(infoSac.primeiraParcela);
        document.getElementById('sac-ultima-parcela').textContent = formatCurrency(infoSac.ultimaParcela);
        document.getElementById('sac-total-juros').textContent = formatCurrency(infoSac.valorTotalJuros);
        document.getElementById('sac-total-pago').textContent = formatCurrency(infoSac.valorTotalFinanciamento);

        //mudar cor caso renda comprometida seja maior que 30!
        var elementoRendaComprometida = document.getElementById('sac-renda-comprometida');
        elementoRendaComprometida.textContent = formatarPorcentagem(infoSac.rendaComprometida);

        if(infoSac.rendaComprometida > 30){

            elementoRendaComprometida.style.color = 'red';
        }else{
            elementoRendaComprometida.style.color='';
        }

        document.getElementById('diferenca-sacprice').textContent = formatCurrency(infoSac.diferencaPriceSac);
        resultadoSAC.style.display = 'block';
    } else {
        resultadoSAC.style.display = 'none';
    }

    if ((modalidade === 'AMBOS') && infoClienteAgiSac) {
        document.getElementById('taxa-clienteAgi-sac').textContent = formatarPorcentagem(infoClienteAgiSac.taxa*100) + '%';
        document.getElementById('sac-primeira-parcela-clienteAgi').textContent = formatCurrency(infoClienteAgiSac.primeiraParcela);
        document.getElementById('sac-ultima-parcela-clienteAgi').textContent = formatCurrency(infoClienteAgiSac.ultimaParcela);
        document.getElementById('sac-total-juros-clienteAgi').textContent = formatCurrency(infoClienteAgiSac.valorTotalJuros);
        document.getElementById('sac-total-pago-clienteAgi').textContent = formatCurrency(infoClienteAgiSac.valorTotalFinanciamento);

        //mudar cor caso renda comprometida seja maior que 30!
        var elementoRendaComprometida = document.getElementById('sac-renda-comprometida-clienteAgi');
        elementoRendaComprometida.textContent = formatarPorcentagem(infoClienteAgiSac.rendaComprometida);

        if(infoSac.rendaComprometida > 30){

            elementoRendaComprometida.style.color = 'red';
        }else{
            elementoRendaComprometida.style.color='';
        }

        document.getElementById('diferenca-sacprice-clienteAgi').textContent = formatCurrency(infoClienteAgiSac.diferencaPriceSac);
        resultadoSacClienteAgi.style.display = 'block';
    } else {
        resultadoSacClienteAgi.style.display = 'none';
    }

    // Mostrar PRICE
    if ((modalidade === 'PRICE'|| modalidade=== "AMBOS") && infoPrice && infoClienteAgiPrice == null) {
        document.getElementById('price-parcela-fixa').textContent = formatCurrency(infoPrice.primeiraParcela);
        document.getElementById('price-total-juros').textContent = formatCurrency(infoPrice.valorTotalJuros);
        document.getElementById('price-total-pago').textContent = formatCurrency(infoPrice.valorTotalFinanciamento);

        var elementoRendaComprometida = document.getElementById('price-renda-comprometida').textContent;
        elementoRendaComprometida = formatarPorcentagem(infoPrice.rendaComprometida);

        if (infoPrice.rendaComprometida > 30){
            elementoRendaComprometida.style.color='red';
        }else{
            elementoRendaComprometida.style.color='';
        }

        document.getElementById('price-renda-comprometida').textContent = formatarPorcentagem(infoPrice.rendaComprometida);
        document.getElementById('diferenca-pricesac').textContent = formatCurrency(infoPrice.diferencaPriceSac);
        resultadoPrice.style.display = 'block';
    } else {
        resultadoPrice.style.display = 'none';
    }

    if ((modalidade === 'AMBOS') && infoClienteAgiPrice) {
        document.getElementById('taxa-clienteAgi-price').textContent = formatarPorcentagem(infoClienteAgiPrice.taxa*100) + '%';
        document.getElementById('price-parcela-fixa-clienteAgi').textContent = formatCurrency(infoClienteAgiPrice.primeiraParcela);
        document.getElementById('price-total-juros-clienteAgi').textContent = formatCurrency(infoClienteAgiPrice.valorTotalJuros);
        document.getElementById('price-total-pago-clienteAgi').textContent = formatCurrency(infoClienteAgiPrice.valorTotalFinanciamento);

        var elementoRendaComprometida = document.getElementById('price-renda-comprometida-clienteAgi');
        elementoRendaComprometida = formatarPorcentagem(infoClienteAgiPrice.rendaComprometida);

        if(infoClienteAgiPrice.rendaComprometida > 30){
            elementoRendaComprometida.style.color='red';
        }else{
            elementoRendaComprometida.style.color='';
        }
        document.getElementById('price-renda-comprometida-clienteAgi').textContent = formatarPorcentagem(infoClienteAgiPrice.rendaComprometida);
        document.getElementById('diferenca-pricesac-clienteAgi').textContent = formatCurrency(infoClienteAgiPrice.diferencaPriceSac);
        resultadoPriceClienteAgi.style.display = 'block';
    } else {
        resultadoPriceClienteAgi.style.display = 'none';
    }
};


    // ======================================================================
    // SUBMISSÃO DO FORMULÁRIO
    // ======================================================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const cpf = cpfInput.value;
        const valorImovel = parseCurrency(document.getElementById('valor-imovel').value);
        const valorEntrada = parseCurrency(document.getElementById('valor-entrada').value);
        const prazoAnos = parseInt(document.getElementById('prazo-anos').value) || 0;
        const rendaBruta = parseCurrency(document.getElementById('renda-bruta').value);
        const incluirParticipante = incluirParticipanteCheckbox.checked;
        const rendaParticipante = incluirParticipante ? parseCurrency(document.getElementById('renda-conjuge').value) : 0;
        const modalidade = document.getElementById('modalidade').value.toUpperCase();
        const isClienteAgi = checkboxAgi.checked;

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

        try {
            const response = await fetch(`${API_BASE_URL}/simulacao`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || result.error || 'Erro ao criar simulação.');

            dadosSimulacao = { ...dataToSend, result };
            console.log("✅ Simulação criada:", result);

            displayResults(result, modalidade);

        } catch (error) {
            console.error('❌ Erro na simulação:', error);
            resultsPlaceholder.textContent = `Erro: ${error.message || 'desconhecido'}`;
            resultsPlaceholder.classList.add('active');
            resultsContent.classList.remove('active');
        }
    });

    // ======================================================================
    // POPUP DE EMAIL
    // ======================================================================
    const togglePopup = () => emailPopup.classList.toggle('active');
    btnEnviarEmail.addEventListener('click', () => {
        if (!dadosSimulacao.result) { alert("Realize a simulação antes de enviar."); return; }
        togglePopup();
    });
    popupCloseBtn.addEventListener('click', togglePopup);
    emailPopup.addEventListener('click', e => { if (e.target === emailPopup) togglePopup(); });

    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const submitButton = emailForm.querySelector('.cta-button');
        const simulacaoId = dadosSimulacao.result?.id;
        if (!simulacaoId) { alert("ID da simulação não encontrado."); return; }

        submitButton.textContent = 'Enviando...';
        submitButton.disabled = true;
        try {
            const url = `${API_BASE_URL}/simulacao/enviarSimulacao/${email}/${simulacaoId}`;
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            if (!response.ok) throw new Error(await response.text().catch(() => 'Erro desconhecido'));
            alert(`Simulação enviada para ${email}!`);
            togglePopup();
            emailForm.reset();
        } catch (error) {
            console.error('Erro no envio de e-mail:', error);
            alert(`Falha ao enviar: ${error.message}`);
        } finally {
            submitButton.textContent = 'Enviar';
            submitButton.disabled = false;
        }
    });

    // ======================================================================
    // GERAR PDF
    // ======================================================================
    btnBaixarPDF.addEventListener('click', async () => {
    const simulacaoId = dadosSimulacao.result?.id;
    if (!simulacaoId) { 
        alert("Realize a simulação antes de gerar PDF."); 
        return; 
    }

    const textoOriginal = btnBaixarPDF.textContent;
    btnBaixarPDF.disabled = true;
    btnBaixarPDF.textContent = "📄 Baixando PDF...";

    try {
        const response = await fetch(`${API_BASE_URL}/simulacao/baixarSimulacao/${simulacaoId}`, { method: 'POST' });
        if (!response.ok) { 
            alert(`Falha ao gerar PDF: ${response.statusText}`); 
            btnBaixarPDF.textContent = textoOriginal;
            btnBaixarPDF.disabled = false;
            return; 
        }

        const blob = await response.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = `simulacao_agimob_${simulacaoId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(urlBlob);

        btnBaixarPDF.textContent = "✅ PDF baixado!";
        setTimeout(() => {
            btnBaixarPDF.textContent = textoOriginal;
            btnBaixarPDF.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Erro ao baixar PDF:', error);
        alert("Erro de rede ao tentar baixar o PDF.");
        btnBaixarPDF.textContent = textoOriginal;
        btnBaixarPDF.disabled = false;
    }
});
});
