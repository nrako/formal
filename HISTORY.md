
### v0.3.0 — 2013-05-12

* Added errors array in result of export `form.export(err).errors`
* Added `options.errors.match` and `options.errors.enum`

### v0.2.0 — 2013-05-09

* Added new form `options.errors` to return custom error messages via `form.export()` with lodash templates
* Added new method `form.getData()` which returns tree data with getters applied

### v0.1.1 — 2013-05-08

#### Fixes

* Fix field initialization where empty value was undefined instead of null
* Fix ValidationError.toString which was overriden by inheritance

