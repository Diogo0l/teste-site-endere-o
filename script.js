let map;
let directionsService;
let directionsRenderer;
let marker1;
let marker2;

function initMap() {
    // Inicializa o mapa com uma posição padrão
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -23.55052, lng: -46.633308 }, // São Paulo, por exemplo
        zoom: 13,
    });
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true, // Vamos adicionar marcadores personalizados
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("cep-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const cepInput = document.getElementById("cep").value.replace(/\D/g, '');
        if (cepInput.length !== 8) {
            alert("CEP inválido! Digite um CEP com 8 números.");
            return;
        }

        try {
            // Buscar endereço do CEP principal
            const enderecoPrincipal = await buscarEndereco(cepInput);
            if (!enderecoPrincipal) {
                alert("CEP não encontrado!");
                return;
            }

            // Exibir endereço principal
            exibirEndereco(enderecoPrincipal, "Principal");

            // Calcular CEP próximo (subtrair 1 do final)
            const cepProximo = calcularCepProximo(cepInput);
            const enderecoProximo = await buscarEndereco(cepProximo);
            if (!enderecoProximo) {
                alert("CEP próximo não encontrado!");
                return;
            }

            // Exibir endereço próximo
            exibirEndereco(enderecoProximo, "Próximo");

            // Exibir no mapa
            exibirNoMapa(enderecoPrincipal, enderecoProximo);
        } catch (error) {
            console.error(error);
            alert("Ocorreu um erro ao buscar os dados.");
        }
    });
});

async function buscarEndereco(cep) {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    if (data.erro) {
        return null;
    }
    return data;
}

function calcularCepProximo(cep) {
    // Subtrai 1 do último dígito
    let numero = parseInt(cep, 10);
    numero = numero - 1;
    // Formata novamente para o CEP com 8 dígitos
    return numero.toString().padStart(8, '0');
}

function exibirEndereco(endereco, tipo) {
    const enderecoDiv = document.getElementById("endereco");
    const p = document.createElement("p");
    p.innerHTML = `<strong>${tipo} CEP:</strong> ${endereco.logradouro}, ${endereco.bairro}, ${endereco.localidade} - ${endereco.uf} (${formatarCep(endereco.cep)})`;
    enderecoDiv.appendChild(p);
}

function formatarCep(cep) {
    return cep.replace(/(\d{5})(\d{3})/, "$1-$2");
}

function exibirNoMapa(endereco1, endereco2) {
    // Limpar informações anteriores
    directionsRenderer.set('directions', null);
    const enderecoCompleto1 = `${endereco1.logradouro}, ${endereco1.bairro}, ${endereco1.localidade}, ${endereco1.uf}, Brasil`;
    const enderecoCompleto2 = `${endereco2.logradouro}, ${endereco2.bairro}, ${endereco2.localidade}, ${endereco2.uf}, Brasil`;

    // Geocodificar os endereços para obter coordenadas
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: enderecoCompleto1 }, (results1, status1) => {
        if (status1 === 'OK' && results1[0]) {
            const location1 = results1[0].geometry.location;

            geocoder.geocode({ address: enderecoCompleto2 }, (results2, status2) => {
                if (status2 === 'OK' && results2[0]) {
                    const location2 = results2[0].geometry.location;

                    // Limpar marcadores anteriores
                    if (marker1) marker1.setMap(null);
                    if (marker2) marker2.setMap(null);

                    // Adicionar marcadores personalizados
                    marker1 = new google.maps.Marker({
                        position: location1,
                        map: map,
                        label: "V",
                        title: "CEP Principal",
                    });

                    marker2 = new google.maps.Marker({
                        position: location2,
                        map: map,
                        label: "P",
                        title: "CEP Próximo",
                    });

                    // Ajustar o mapa para exibir ambos os pontos
                    const bounds = new google.maps.LatLngBounds();
                    bounds.extend(location1);
                    bounds.extend(location2);
                    map.fitBounds(bounds);

                    // Traçar rota entre os dois pontos
                    directionsService.route(
                        {
                            origin: location1,
                            destination: location2,
                            travelMode: google.maps.TravelMode.DRIVING,
                        },
                        (response, status) => {
                            if (status === "OK") {
                                directionsRenderer.setDirections(response);
                            } else {
                                alert("Não foi possível traçar a rota.");
                            }
                        }
                    );
                } else {
                    alert("Endereço próximo não encontrado no Google Maps.");
                }
            });
        } else {
            alert("Endereço principal não encontrado no Google Maps.");
        }
    });

    // Exibir os endereços no console (opcional)
    console.log("Endereço Principal:", enderecoCompleto1);
    console.log("Endereço Próximo:", enderecoCompleto2);
}
