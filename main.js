// Importações necessárias do OpenLayers e Chart.js
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import OSM from 'ol/source/OSM';
import Chart from 'chart.js/auto';

// Função para criar a camada base OSM
function createBaseLayer() {
  return new TileLayer({ source: new OSM() });
}

// Cria uma camada WMS do GeoServer com base no nome fornecido
function createWMSLayer(layerName) {
  return new TileLayer({
    source: new TileWMS({
      url: 'http://localhost:8080/geoserver/cvi/wms',
      params: { 'LAYERS': `cvi:${layerName}`, 'TILED': true },
      serverType: 'geoserver'
    }),
    visible: false // Inicialmente invisível
  });
}

// Inicialização do mapa com a vista centrada
const map = new Map({
  target: 'map',
  view: new View({
    center: [-2838424, 4546730],
    zoom: 11.5
  })
});

// Criação das camadas
const baseLayer = createBaseLayer();
const pcviLayer = createWMSLayer('pcvi');
const hcviLayer = createWMSLayer('hcvi');
const ccviLayer = createWMSLayer('ccvi');
const relationLayer = createWMSLayer('relation');

// Adição das camadas ao mapa com boas práticas (uma a uma)
map.addLayer(baseLayer);
map.addLayer(pcviLayer);
map.addLayer(hcviLayer);
map.addLayer(ccviLayer);
map.addLayer(relationLayer);

// Apenas PCVI visível por defeito
pcviLayer.setVisible(true);

// Variáveis DOM e gráfico
let chart = null;
const ctx = document.getElementById('resultChart');
const legendContainer = document.getElementById('legend');
const descriptionContainer = document.getElementById('layerDescription');

// Função para atualizar o gráfico
function updateChart(props, activeLayer) {
  let labels = [], values = [], colors = [];

  // Lógica para cada tipo de camada
  if (activeLayer === 'pcvi') {
    labels = ['Swell', 'Praia', 'Defesas', 'Arriba', 'Inundação'];
    values = [props.swell, props.praia, props.defend_first, props.tipo_arrib, props.inund];
    colors = ['#4a90e2', '#50e3c2', '#f5a623', '#9013fe', '#f8e71c'];
  } else if (activeLayer === 'hcvi') {
    labels = ['Infraestruturas', 'Turismo', 'Densidade Pop.', 'Empresas', 'Património'];
    values = [props.infra, props.al_tour, props.den_pop, props.emp, props.pat_cul];
    colors = ['#4a90e2', '#f76c6c', '#f8e71c', '#f5a623', '#7ed6df'];
  } else if (activeLayer === 'ccvi') {
    labels = ['PCVI', 'HCVI'];
    values = [props.pcvi_total, props.hcvi_total];
    colors = ['#50e3c2', '#f76c6c'];
  } else if (activeLayer === 'relation') {
    labels = ['Relação HCVI / PCVI'];
    values = [props.relation];
    colors = ['#4a90e2'];
  }

  // Recria o gráfico com os novos dados
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data: values, backgroundColor: colors }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  // Atualiza a legenda
  legendContainer.innerHTML = '';
  labels.forEach((label, i) => {
    legendContainer.innerHTML += `<div><span style="background-color:${colors[i]}"></span>${label}</div>`;
  });
}

// Função para mostrar descrição textual da camada
function updateLayerDescription(layer) {
  const descriptions = {
    pcvi: 'Índice de Vulnerabilidade Costeira Físico(PCVI) baseado em critérios como swell, tipo de praia, defesas costeiras, tipo de arriba e exposição à inundação.',
    hcvi: 'Índice de Vulnerabilidade Costeira Humano (HCVI) que considera infraestruturas, turismo, densidade populacional, empresas e património cultural.',
    ccvi: 'Índice Combinado (CCVI) que integra as componentes física (PCVI) e humana (HCVI).',
    relation: 'Relação entre o HCVI e o PCVI. Representa a proporcionalidade entre as componentes humana e física da vulnerabilidade.'
  };
  descriptionContainer.textContent = descriptions[layer] || '';
}

// Evento ao clicar no mapa (GetFeatureInfo)
map.on('singleclick', function (evt) {
  const viewResolution = map.getView().getResolution();
  const activeLayer = document.querySelector('.toggle-btn.active')?.getAttribute('data-layer');
  let layer;

  switch (activeLayer) {
    case 'pcvi': layer = pcviLayer; break;
    case 'hcvi': layer = hcviLayer; break;
    case 'ccvi': layer = ccviLayer; break;
    case 'relation': layer = relationLayer; break;
    default: return;
  }

  // Geração da URL GetFeatureInfo
  const url = layer.getSource().getFeatureInfoUrl(
    evt.coordinate,
    viewResolution,
    'EPSG:3857',
    { 'INFO_FORMAT': 'application/json' }
  );

  // Requisição e processamento dos dados
  if (url) {
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.features.length > 0) {
          const props = data.features[0].properties;
          updateChart(props, activeLayer);
          updateLayerDescription(activeLayer);
        }
      })
      .catch(error => console.error('Erro no GetFeatureInfo:', error));
  }
});

// Botões para alternar camadas temáticas
const toggleButtons = document.querySelectorAll('.toggle-btn');
toggleButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const selectedLayer = btn.getAttribute('data-layer');

    // Atualiza visibilidade
    pcviLayer.setVisible(selectedLayer === 'pcvi');
    hcviLayer.setVisible(selectedLayer === 'hcvi');
    ccviLayer.setVisible(selectedLayer === 'ccvi');
    relationLayer.setVisible(selectedLayer === 'relation');

    // Atualiza botão ativo
    toggleButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Atualiza descrição textual
    updateLayerDescription(selectedLayer);
  });
});
