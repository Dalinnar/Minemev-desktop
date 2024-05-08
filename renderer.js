const icongen = require('icon-gen');

const options = {
    report: true,
    ico: {
      name: 'app',
      sizes: [16, 24, 32, 48, 64, 128, 256]
    },
    icns: {
      name: 'app',
      sizes: [16, 32, 64, 128, 256, 512, 1024]
    },
    favicon: {
      name: 'favicon-',
      pngSizes: [32, 57, 72, 96, 120, 128, 144, 152, 195, 228],
      icoSizes: [16, 24, 32, 64, 256] // Agregamos el tamaño 256 para el favicon.ico
    }
  };

  
icongen('./siganture_logo.png', './icons', options)
.then((results) => {
  console.log(results);
})
.catch((err) => {
  console.error(err);
});