/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoic2VhbmJhcmtlciIsImEiOiJja2p0MmUyZTkxM2tsMnFxaGN0dGk1MGo5In0.-kzqHxyy0WSaKL0UvAzzoA';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/seanbarker/ckjt47f3y05n019les42yvetp',
    // center: [-118.113491, 34.111745],
    // zoom: 4,
    scrollZoom: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //add marker
    const el = document.createElement('div');
    el.className = 'marker';

    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    //add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
