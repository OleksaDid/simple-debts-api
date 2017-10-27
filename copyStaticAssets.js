var shell = require('shelljs');

shell.cp('-R', 'src/public/js/lib', 'swagger/public/js/');
shell.cp('-R', 'src/public/fonts', 'swagger/public/');
shell.cp('-R', 'src/public/images', 'swagger/public/');
