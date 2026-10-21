import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { MovimientoFormComponent } from '../movimiento-form.component';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { iconos } from '../../../../core/icons';
import { Movimiento } from '../../../../core/models';
import { crearMovimiento, crearProducto } from '../../../../testing/factories';

describe('MovimientoFormComponent', () => {
  let componente: MovimientoFormComponent;
  let fixture: ComponentFixture<MovimientoFormComponent>;
  let httpMock: HttpTestingController;
  let notificaciones: NotificacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MovimientoFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideIcons(iconos)]
    });

    fixture = TestBed.createComponent(MovimientoFormComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    notificaciones = TestBed.inject(NotificacionService);
  });

  afterEach(() => httpMock.verify());

  const esperar = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };

  const responderProductos = (productos = [crearProducto()]) =>
    httpMock
      .expectOne((req) => req.url === '/api/inventario')
      .flush({ items: productos, pagina: 1, tamanoPagina: 100, totalRegistros: productos.length, totalPaginas: 1 });

  const inicializar = async (modo: 'entrada' | 'salida' | 'ajuste' = 'entrada') => {
    componente.modo = modo;
    fixture.detectChanges();
    responderProductos();
    await esperar();
    fixture.detectChanges();
  };

  it('carga los productos activos para el desplegable', async () => {
    await inicializar();

    expect(componente.productos().length).toBe(1);
    expect(componente.cargando()).toBe(false);
  });

  it('exige seleccionar un producto', async () => {
    await inicializar();

    await componente.registrar();

    expect(componente.errores()['productoId']).toBeTruthy();
    httpMock.expectNone('/api/movimientos/entradas');
  });

  it('exige una cantidad mayor a cero en el modo entrada', async () => {
    await inicializar();

    componente.onProductoChange(1);
    componente.cantidad.set(0);

    await componente.registrar();

    expect(componente.errores()['cantidad']).toBeTruthy();
    httpMock.expectNone('/api/movimientos/entradas');
  });

  it('exige un stock final valido en el modo ajuste', async () => {
    await inicializar('ajuste');

    componente.onProductoChange(1);
    componente.stockFinal.set(-1);

    await componente.registrar();

    expect(componente.errores()['stockFinal']).toBeTruthy();
    httpMock.expectNone('/api/movimientos/ajustes');
  });

  it('limpia los errores cuando la validacion es correcta', async () => {
    await inicializar();

    componente.onProductoChange(1);
    componente.cantidad.set(-5);
    await componente.registrar();
    expect(componente.errores()['cantidad']).toBeTruthy();

    componente.cantidad.set(10);
    const promesa = componente.registrar();

    const peticion = httpMock.expectOne('/api/movimientos/entradas');
    peticion.flush(crearMovimiento({ cantidad: 10 }));

    await promesa;

    expect(componente.errores()['cantidad']).toBeUndefined();
  });

  it('registra una entrada con los datos del formulario', async () => {
    await inicializar('entrada');

    componente.onProductoChange(1);
    componente.cantidad.set(25);
    componente.motivo.set('Compra a proveedor');
    componente.referencia.set('FAC-001');
    componente.precioUnitario.set(1300);

    const promesa = componente.registrar();

    const peticion = httpMock.expectOne('/api/movimientos/entradas');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      productoId: 1,
      cantidad: 25,
      precioUnitario: 1300,
      motivo: 'Compra a proveedor',
      referencia: 'FAC-001'
    });
    peticion.flush(crearMovimiento({ tipo: 'Entrada', cantidad: 25 }));

    await promesa;
  });

  it('emite el movimiento registrado y notifica el exito', async () => {
    await inicializar('entrada');

    let emitido: Movimiento | null = null;
    componente.onRegistrado.subscribe((m) => (emitido = m));

    componente.onProductoChange(1);
    componente.cantidad.set(25);

    const promesa = componente.registrar();
    httpMock.expectOne('/api/movimientos/entradas').flush(crearMovimiento({ cantidad: 25 }));

    await promesa;

    expect(emitido).not.toBeNull();
    expect((emitido as unknown as Movimiento).cantidad).toBe(25);
    expect(notificaciones.notificaciones().some((n) => n.tipo === 'exito')).toBe(true);
  });

  it('limpia el formulario tras registrar', async () => {
    await inicializar('entrada');

    componente.onProductoChange(1);
    componente.cantidad.set(25);
    componente.motivo.set('Compra');

    const promesa = componente.registrar();
    httpMock.expectOne('/api/movimientos/entradas').flush(crearMovimiento());

    await promesa;

    expect(componente.cantidad()).toBeNull();
    expect(componente.motivo()).toBe('');
  });

  it('registra una salida sin enviar el precio unitario', async () => {
    await inicializar('salida');

    componente.onProductoChange(1);
    componente.cantidad.set(5);
    componente.motivo.set('Despacho');

    const promesa = componente.registrar();

    const peticion = httpMock.expectOne('/api/movimientos/salidas');
    expect(peticion.request.body).toEqual({
      productoId: 1,
      cantidad: 5,
      motivo: 'Despacho',
      referencia: undefined
    });
    peticion.flush(crearMovimiento({ tipo: 'Salida' }));

    await promesa;
  });

  it('muestra el error de stock insuficiente devuelto por la API', async () => {
    await inicializar('salida');

    componente.onProductoChange(1);
    componente.cantidad.set(9999);

    const promesa = componente.registrar();

    httpMock.expectOne('/api/movimientos/salidas').flush(
      {
        title: 'Conflicto con el estado actual',
        status: 409,
        detail: 'El producto tiene 5 unidades en stock y se intentan retirar 9999.',
        codigo: 'STOCK_INSUFICIENTE'
      },
      { status: 409, statusText: 'Conflict' }
    );

    await promesa;

    const errores = notificaciones.notificaciones().filter((n) => n.tipo === 'error');
    expect(errores.length).toBe(1);
    expect(errores[0].mensaje).toContain('5 unidades en stock');
  });

  it('registra un ajuste con el stock final', async () => {
    await inicializar('ajuste');

    componente.onProductoChange(1);
    componente.stockFinal.set(50);
    componente.motivo.set('Conteo fisico');

    const promesa = componente.registrar();

    const peticion = httpMock.expectOne('/api/movimientos/ajustes');
    expect(peticion.request.body).toEqual({
      productoId: 1,
      stockFinal: 50,
      motivo: 'Conteo fisico',
      referencia: undefined
    });
    peticion.flush(crearMovimiento({ tipo: 'AjustePositivo' }));

    await promesa;
  });

  it('sugiere el precio unitario del producto al seleccionarlo', async () => {
    await inicializar('entrada');

    componente.precioUnitario.set(null);
    componente.onProductoChange(1);

    expect(componente.precioUnitario()).toBe(1250);
  });

  it('filtra los productos por nombre o codigo', async () => {
    await inicializar();

    componente.busquedaProducto.set('guante');

    const resultados = componente.productosFiltrados();
    expect(resultados.length).toBe(0);

    componente.busquedaProducto.set('carton');
    expect(componente.productosFiltrados().length).toBe(1);
  });

  it('devuelve todos los productos cuando no hay texto de busqueda', async () => {
    await inicializar();

    expect(componente.productosFiltrados().length).toBe(1);
  });

  it('expone el producto seleccionado', async () => {
    await inicializar();

    componente.onProductoChange(1);

    expect(componente.productoSeleccionado()?.codigo).toBe('ALM-001');
  });

  it('muestra el titulo y la descripcion segun el modo', async () => {
    await inicializar('entrada');
    expect(componente.titulo()).toBe('Entrada');
    expect(componente.descripcion()).toContain('ingreso de mercaderia');

    componente.modo = 'salida';
    expect(componente.titulo()).toBe('Salida');

    componente.modo = 'ajuste';
    expect(componente.titulo()).toBe('Ajuste');
  });

  it('renderiza el campo de cantidad en entrada y el de stock final en ajuste', async () => {
    await inicializar('entrada');
    let html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('#cantidad')).toBeTruthy();
    expect(html.querySelector('#stockFinal')).toBeNull();

    //setInput notifica a Angular del cambio y dispara el re-renderizado.
    fixture.componentRef.setInput('modo', 'ajuste');
    fixture.detectChanges();
    html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('#stockFinal')).toBeTruthy();
    expect(html.querySelector('#cantidad')).toBeNull();
  });
});
