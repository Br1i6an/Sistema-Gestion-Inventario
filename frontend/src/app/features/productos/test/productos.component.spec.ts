import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { ProductosComponent } from '../productos.component';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { iconos } from '../../../core/icons';
import { crearCategoria, crearPagina, crearProducto } from '../../../testing/factories';

describe('ProductosComponent', () => {
  let componente: ProductosComponent;
  let fixture: ComponentFixture<ProductosComponent>;
  let httpMock: HttpTestingController;
  let notificaciones: NotificacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideIcons(iconos)]
    });

    fixture = TestBed.createComponent(ProductosComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    notificaciones = TestBed.inject(NotificacionService);
  });

  afterEach(() => httpMock.verify());

  const esperar = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };

  const responderCategorias = () =>
    httpMock.expectOne('/api/inventario/categorias').flush([crearCategoria()]);

  const responderProductos = (productos = [crearProducto()]) =>
    httpMock
      .expectOne((req) => req.url === '/api/inventario')
      .flush(crearPagina(productos, { totalRegistros: productos.length }));

  const inicializar = async (productos = [crearProducto()]) => {
    fixture.detectChanges();
    responderCategorias();
    await esperar();
    responderProductos(productos);
    await esperar();
    fixture.detectChanges();
  };

  it('carga las categorias y el catalogo de productos', async () => {
    await inicializar();

    expect(componente.categorias().length).toBe(1);
    expect(componente.productos().length).toBe(1);
    expect(componente.cargando()).toBe(false);
  });

  it('incluye tambien los productos dados de baja', async () => {
    fixture.detectChanges();

    responderCategorias();
    await esperar();

    const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion.request.params.get('soloActivos')).toBe('false');
    peticion.flush(crearPagina([crearProducto()]));

    await esperar();
  });

  it('abre el modal de alta con el formulario vacio', async () => {
    await inicializar();

    componente.abrirCrear();

    expect(componente.modalAbierto()).toBe(true);
    expect(componente.modoEdicion()).toBe('crear');
    expect(componente.productoEditando()).toBeNull();
    expect(componente.form().codigo).toBe('');
  });

  it('exige codigo, nombre y categoria antes de guardar', async () => {
    await inicializar();

    componente.abrirCrear();
    await componente.guardar();

    expect(notificaciones.notificaciones().some((n) => n.tipo === 'aviso')).toBe(true);
    httpMock.expectNone('/api/productos');
  });

  it('crea el producto y recarga el catalogo', async () => {
    await inicializar();

    componente.abrirCrear();
    componente.actualizarForm('codigo', 'NUE-001');
    componente.actualizarForm('nombre', 'Producto nuevo');
    componente.actualizarForm('categoriaId', 1);

    const promesa = componente.guardar();

    const peticion = httpMock.expectOne('/api/productos');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toMatchObject({
      codigo: 'NUE-001',
      nombre: 'Producto nuevo',
      categoriaId: 1
    });
    peticion.flush(crearProducto({ id: 19, codigo: 'NUE-001', nombre: 'Producto nuevo' }));

    await esperar();
    responderProductos([crearProducto({ id: 19, codigo: 'NUE-001' })]);
    await esperar();

    await promesa;

    expect(componente.modalAbierto()).toBe(false);
    expect(notificaciones.notificaciones().some((n) => n.tipo === 'exito')).toBe(true);
  });

  it('muestra el error si la API rechaza el alta', async () => {
    await inicializar();

    componente.abrirCrear();
    componente.actualizarForm('codigo', 'NUE-001');
    componente.actualizarForm('nombre', 'Producto nuevo');
    componente.actualizarForm('categoriaId', 1);

    const promesa = componente.guardar();

    httpMock
      .expectOne('/api/productos')
      .flush(
        { title: 'Solicitud invalida', detail: 'El codigo ya esta registrado.' },
        { status: 409, statusText: 'Conflict' }
      );

    await promesa;

    expect(notificaciones.notificaciones().some((n) => n.tipo === 'error')).toBe(true);
    expect(componente.modalAbierto()).toBe(true);
  });

  it('abre el modal de edicion con los datos del producto', async () => {
    await inicializar();

    const producto = crearProducto({ id: 5, nombre: 'Producto original', precioUnitario: 900 });
    componente.abrirEditar(producto);

    expect(componente.modalAbierto()).toBe(true);
    expect(componente.modoEdicion()).toBe('editar');
    expect(componente.productoEditando()?.id).toBe(5);
    expect(componente.form().nombre).toBe('Producto original');
    expect(componente.form().precioUnitario).toBe(900);
  });

  it('actualiza el producto con un PUT', async () => {
    await inicializar();

    componente.abrirEditar(crearProducto({ id: 5 }));
    componente.actualizarForm('nombre', 'Producto editado');

    const promesa = componente.guardar();

    const peticion = httpMock.expectOne('/api/productos/5');
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toMatchObject({ nombre: 'Producto editado' });
    peticion.flush(crearProducto({ id: 5, nombre: 'Producto editado' }));

    await esperar();
    responderProductos();
    await esperar();

    await promesa;
  });

  it('no altera el stock al editar un producto', async () => {
    await inicializar();

    componente.abrirEditar(crearProducto({ id: 5, stockActual: 42 }));
    componente.actualizarForm('nombre', 'Producto editado');

    const promesa = componente.guardar();

    const peticion = httpMock.expectOne('/api/productos/5');
    expect((peticion.request.body as { stockInicial?: number }).stockInicial).toBe(0);
    peticion.flush(crearProducto({ id: 5, stockActual: 42 }));

    await esperar();
    responderProductos();
    await esperar();

    await promesa;
  });

  it('solicita confirmacion antes de dar de baja un producto', async () => {
    await inicializar();

    componente.solicitarBaja(crearProducto({ id: 5 }));

    expect(componente.confirmarBaja()).toBe(true);
    expect(componente.productoABorrar()?.id).toBe(5);
  });

  it('da de baja el producto al confirmar', async () => {
    await inicializar();

    componente.solicitarBaja(crearProducto({ id: 5 }));

    const promesa = componente.confirmarDarDeBaja();

    const peticion = httpMock.expectOne('/api/productos/5');
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush({ exitoso: true, mensaje: 'Producto dado de baja correctamente.' });

    await esperar();
    responderProductos();
    await esperar();

    await promesa;

    expect(componente.productoABorrar()).toBeNull();
    expect(notificaciones.notificaciones().some((n) => n.tipo === 'exito')).toBe(true);
  });

  it('aplica el filtro de busqueda', async () => {
    await inicializar();

    componente.busqueda.set('guante');
    const promesa = componente.aplicarFiltros();

    const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion.request.params.get('busqueda')).toBe('guante');
    peticion.flush(crearPagina([]));

    await promesa;
  });

  it('cambia de pagina', async () => {
    await inicializar();

    const promesa = componente.cambiarPagina(2);

    const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion.request.params.get('pagina')).toBe('2');
    peticion.flush(crearPagina([crearProducto()], { pagina: 2 }));

    await promesa;

    expect(componente.pagina()).toBe(2);
  });

  it('clasifica el estado de stock', () => {
    expect(componente.claseEstado('Agotado')).toBe('badge--agotado');
    expect(componente.claseEstado('Bajo')).toBe('badge--bajo');
    expect(componente.claseEstado('Normal')).toBe('badge--normal');
  });

  it('cierra el modal sin guardar', async () => {
    await inicializar();

    componente.abrirCrear();
    componente.cerrarModal();

    expect(componente.modalAbierto()).toBe(false);
  });

  it('renderiza una fila por producto', async () => {
    await inicializar();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelectorAll('tbody tr').length).toBe(1);
    expect(html.textContent).toContain('ALM-001');
  });

  it('marca visualmente los productos inactivos', async () => {
    await inicializar([
      crearProducto({ id: 1, activo: false }),
      crearProducto({ id: 2, activo: true })
    ]);

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Inactivo');
  });
});
