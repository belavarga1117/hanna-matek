import {ApiError, createApiClient} from './api-client.js';
import {COMMON_GAME_SETTINGS, GAME_RULES, normalizeGameSettings} from './game-engine.js';

const SCHOOL_PATHS = new Set([
  '/fiok', '/tanar', '/tanar/tanulok', '/tanar/csoportok',
  '/tanar/feladatsorok', '/tanar/eredmenyek', '/feladataim',
  '/haladas', '/aktivalas', '/eredmenyek',
]);

const FALLBACK_LEVELS = {
  stations: 2, code: 3, faces: 3, prices: 2, shopping: 2, picture: 2,
};

export function createSchool({h, games = [], onPlay, onAuthChange = () => {}, renderPractice = () => { location.hash = '#/'; }} = {}) {
  if (typeof h !== 'function') throw new TypeError('A createSchool számára szükséges a h elemkészítő.');
  const app = document.querySelector('#app');
  if (!app) throw new Error('Hiányzik a #app gyökérelem.');

  let currentUser = null;
  let csrfToken = null;
  let setupRequired = false;
  let supported = null;
  let renderGeneration = 0;
  let controller = null;
  let authNotice = '';

  const apiClient = createApiClient({
    getCsrf: () => csrfToken,
    onUnauthorized: () => {
      if (!currentUser) return;
      setSession(null, null);
      authNotice = 'A munkameneted lejárt. Lépj be újra.';
      location.hash = '#/fiok';
    },
  });
  const api = Object.assign(
    (path, options) => apiClient.request(path, options),
    {request: apiClient.request, get: apiClient.get, post: apiClient.post, patch: apiClient.patch},
  );

  function setSession(user, token) {
    const changed = currentUser?.id !== user?.id || currentUser?.role !== user?.role;
    currentUser = user || null;
    csrfToken = token || null;
    if (changed) {
      renderGeneration++;
      controller?.abort();
      app.replaceChildren();
      onAuthChange(currentUser);
    }
  }

  async function init() {
    try {
      const session = await api.get('/api/session');
      supported = true;
      setupRequired = !!session.setupRequired;
      setSession(session.user, session.csrfToken);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        supported = false;
        setSession(null, null);
        return {supported: false, user: null};
      }
      supported = true;
      setSession(null, null);
      authNotice = error.message;
    }
    return {supported, user: currentUser};
  }

  async function refresh() {
    const state = await init();
    if (state.supported) renderRoute();
    return state;
  }

  function routeInfo() {
    const raw = (location.hash || '#/').replace(/^#/, '');
    const url = new URL(raw.startsWith('/') ? raw : `/${raw}`, location.origin);
    return {path: url.pathname.replace(/\/$/, '') || '/', query: url.searchParams};
  }

  function renderRoute() {
    const route = routeInfo();
    const generation = ++renderGeneration;
    controller?.abort();
    controller = null;
    if (!SCHOOL_PATHS.has(route.path) || supported === false) return false;
    controller = new AbortController();
    const signal = controller.signal;

    if (supported === null) {
      renderLoading('Kapcsolódás…');
      init().then(() => {
        if (generation === renderGeneration && supported) renderRoute();
      });
      return true;
    }

    if (route.path === '/fiok') renderAccount();
    else if (route.path === '/aktivalas') renderActivation(route.query, signal, generation);
    else if (route.path.startsWith('/tanar')) renderTeacherRoute(route, signal, generation);
    else if (route.path === '/feladataim') renderStudentAssignments(signal, generation);
    else if (route.path === '/haladas') renderStudentProgress(signal, generation);
    else if (route.path === '/eredmenyek') {
      if (currentUser?.role === 'teacher') renderTeacherResults(route.query, signal, generation);
      else if (currentUser?.role === 'student') renderStudentProgress(signal, generation);
      else renderAccount();
    }
    return true;
  }

  function renderNav(active = '') {
    const items = currentUser?.role === 'teacher'
      ? [['/tanar', 'Áttekintés'], ['/tanar/tanulok', 'Tanulók'], ['/tanar/csoportok', 'Csoportok'], ['/tanar/feladatsorok', 'Feladatsorok'], ['/tanar/eredmenyek', 'Eredmények']]
      : currentUser?.role === 'student'
        ? [['/feladataim', 'Feladataim'], ['/haladas', 'Haladásom']]
        : [];
    return h('nav', {className: 'school-nav', 'aria-label': 'Iskolai menü'},
      items.map(([path, label]) => h('a', {
        href: `#${path}`,
        className: active === path || (path !== '/tanar' && active.startsWith(path)) ? 'school-nav-link current' : 'school-nav-link',
        'aria-current': active === path ? 'page' : null,
      }, label)),
    );
  }

  function renderFooter() {
    return h('footer', {className: 'site-footer school-footer'},
      h('span', {}, 'A fejlődésedet a saját gyakorlásodhoz mérjük.'),
      h('span', {}, 'Személyes adatot nem küldünk emailben.'),
    );
  }

  function schoolHeader(active) {
    return h('header', {className: 'school-header'},
      h('a', {href: '#/', className: 'brand', 'aria-label': 'Memória Műhely – kezdőlap'},
        h('span', {className: 'brand-mark', 'aria-hidden': 'true'}, 'm'),
        h('span', {}, 'memória', h('strong', {}, 'műhely')),
      ),
      currentUser ? renderNav(active) : h('span', {className: 'school-header-note'}, 'Tanulói és tanári fiók'),
      h('div', {className: 'school-account'},
        currentUser
          ? h('a', {href: '#/fiok', className: active === '/fiok' ? 'school-account-link current' : 'school-account-link'},
              h('span', {className: 'account-avatar', 'aria-hidden': 'true'}, initials(currentUser.displayName)),
              h('span', {}, h('strong', {}, currentUser.displayName), h('small', {}, currentUser.role === 'teacher' ? 'Tanár' : 'Tanuló')))
          : h('a', {href: '#/fiok', className: 'secondary-button compact-button'}, 'Belépés'),
      ),
    );
  }

  function shell(content, active = '') {
    app.replaceChildren(schoolHeader(active), h('main', {id: 'main-content', className: 'main school-main'}, content), renderFooter());
    window.scrollTo?.({top: 0, behavior: 'instant'});
  }

  function renderLoading(label = 'Betöltés…', active = routeInfo().path) {
    shell(h('div', {className: 'school-status', role: 'status'},
      h('span', {className: 'school-spinner', 'aria-hidden': 'true'}),
      h('p', {}, label),
    ), active);
  }

  function renderError(error, retry, active = routeInfo().path) {
    if (error?.name === 'AbortError') return;
    shell(h('section', {className: 'school-status error-state', role: 'alert'},
      h('span', {className: 'status-symbol', 'aria-hidden': 'true'}, '!'),
      h('h1', {}, 'Most nem sikerült betölteni'),
      h('p', {}, error?.message || 'Ismeretlen hiba történt.'),
      retry ? h('button', {className: 'primary-button', onClick: retry}, 'Újrapróbálom') : null,
    ), active);
  }

  function isCurrent(generation) { return generation === renderGeneration; }

  function requireRole(role, active) {
    if (!currentUser) {
      authNotice = 'Ehhez az oldalhoz előbb lépj be.';
      renderAccount();
      return false;
    }
    if (currentUser.role !== role) {
      shell(h('section', {className: 'school-status'},
        h('h1', {}, 'Ez az oldal másik szerepkörhöz tartozik'),
        h('p', {}, role === 'teacher' ? 'A tanári felülethez tanári fiók szükséges.' : 'A feladatokat tanulói fiókkal érheted el.'),
        h('a', {className: 'primary-button', href: currentUser.role === 'teacher' ? '#/tanar' : '#/feladataim'}, 'A saját kezdőoldalam'),
      ), active);
      return false;
    }
    return true;
  }

  function renderAccount() {
    const notice = authNotice;
    authNotice = '';
    if (currentUser) {
      const logout = h('button', {className: 'secondary-button'}, 'Kilépés');
      logout.addEventListener('click', () => withButton(logout, async () => {
        await api.post('/api/auth/logout', {});
        setSession(null, null);
        authNotice = 'Sikeresen kiléptél.';
        renderAccount();
      }, renderInlineError(logout)));
      shell(h('div', {className: 'account-page'},
        noticeNode(notice),
        h('section', {className: 'school-hero compact-school-hero'},
          h('span', {className: 'eyebrow'}, 'FIÓK'),
          h('h1', {}, `Szia, ${currentUser.displayName}!`),
          h('p', {}, currentUser.role === 'teacher' ? 'Innen éred el a tanulókat, csoportokat és eredményeket.' : 'Innen folytathatod a feladataidat és követheted a haladásodat.'),
        ),
        h('section', {className: 'account-card'},
          h('div', {className: 'account-identity'}, h('span', {className: 'account-avatar large', 'aria-hidden': 'true'}, initials(currentUser.displayName)), h('div', {}, h('h2', {}, currentUser.displayName), h('p', {}, `Felhasználónév: ${currentUser.username}`))),
          h('div', {className: 'school-actions'},
            h('a', {className: 'primary-button', href: currentUser.role === 'teacher' ? '#/tanar' : '#/feladataim'}, 'Tovább a felületre'),
            h('button', {className: 'secondary-button', onClick: () => renderPractice()}, 'Szabad gyakorlás'),
            logout,
          ),
        ),
      ), '/fiok');
      return;
    }

    if (setupRequired) renderOwnerSetup(notice);
    else renderLogin(notice);
  }

  function renderLogin(notice) {
    const form = h('form', {className: 'auth-card'},
      h('span', {className: 'eyebrow'}, 'BELÉPÉS'),
      h('h1', {}, 'Folytasd ott, ahol tartasz.'),
      h('p', {className: 'muted'}, 'Add meg a tanártól kapott felhasználónevedet és a jelszavadat.'),
      noticeNode(notice),
      field('Felhasználónév', h('input', {name: 'username', autocomplete: 'username', required: true, maxlength: '80'})),
      field('Jelszó', h('input', {name: 'password', type: 'password', autocomplete: 'current-password', required: true})),
      h('p', {className: 'form-error', role: 'alert'}),
      h('button', {className: 'primary-button auth-submit', type: 'submit'}, 'Belépek'),
    );
    form.addEventListener('submit', event => {
      event.preventDefault();
      const button = form.querySelector('[type=submit]');
      clearFormError(form);
      withButton(button, async () => {
        const values = new FormData(form);
        const result = await api.post('/api/auth/login', {username: values.get('username')?.trim(), password: values.get('password')});
        setSession(result.user, result.csrfToken);
        location.hash = result.user.role === 'teacher' ? '#/tanar' : '#/feladataim';
      }, error => showFormError(form, error));
    });
    shell(h('div', {className: 'auth-layout'},
      h('section', {className: 'auth-intro'}, h('span', {className: 'eyebrow'}, 'MEMÓRIA MŰHELY'), h('h2', {}, 'Rövid feladatok, követhető fejlődés.'), h('p', {}, 'A tanár összeállítja a gyakorlást. A tanuló minden kör után rögtön látja az eredményét.')),
      form,
    ), '/fiok');
  }

  function renderOwnerSetup(notice) {
    const form = h('form', {className: 'auth-card wide-auth-card'},
      h('span', {className: 'eyebrow'}, 'ELSŐ AKTIVÁLÁS'),
      h('h1', {}, 'Hozd létre a tanári fiókot.'),
      h('p', {className: 'muted'}, 'Az egyszer használható aktiváló kódot az üzemeltetőtől kapod. A kódot csak most kell megadnod.'),
      noticeNode(notice),
      field('Aktiváló kód', h('input', {name: 'token', type: 'password', autocomplete: 'off', required: true})),
      h('div', {className: 'form-grid'},
        field('Felhasználónév', h('input', {name: 'username', autocomplete: 'username', required: true, maxlength: '80'})),
        field('Megjelenő név', h('input', {name: 'displayName', autocomplete: 'name', required: true, maxlength: '120'})),
      ),
      field('Jelszó', h('input', {name: 'password', type: 'password', autocomplete: 'new-password', required: true, minlength: '8'})),
      h('p', {className: 'form-error', role: 'alert'}),
      h('button', {className: 'primary-button auth-submit', type: 'submit'}, 'Tanári fiók létrehozása'),
    );
    form.addEventListener('submit', event => {
      event.preventDefault();
      const button = form.querySelector('[type=submit]');
      clearFormError(form);
      withButton(button, async () => {
        const values = new FormData(form);
        const result = await api.post('/api/auth/setup', {
          token: values.get('token'), username: values.get('username')?.trim(),
          displayName: values.get('displayName')?.trim(), password: values.get('password'),
        });
        setupRequired = false;
        setSession(result.user, result.csrfToken);
        location.hash = '#/tanar';
      }, error => showFormError(form, error));
    });
    shell(h('div', {className: 'auth-layout single-auth'}, form), '/fiok');
  }

  async function renderActivation(query, signal, generation) {
    const token = query.get('token') || '';
    if (!token) {
      renderError(new Error('Az aktiváló linkből hiányzik a token.'), null, '/aktivalas');
      return;
    }
    renderLoading('Az aktiváló link ellenőrzése…', '/aktivalas');
    try {
      const info = await api.get(`/api/auth/activation?token=${encodeURIComponent(token)}`, {signal});
      if (!isCurrent(generation)) return;
      const form = h('form', {className: 'auth-card'},
        h('span', {className: 'eyebrow'}, 'FIÓK AKTIVÁLÁSA'),
        h('h1', {}, `Üdv, ${info.displayName}!`),
        h('p', {className: 'muted'}, `Felhasználónév: ${info.username}`),
        h('p', {className: 'activation-expiry'}, `A link eddig használható: ${formatDate(info.expiresAt)}`),
        field('Válassz jelszót', h('input', {name: 'password', type: 'password', autocomplete: 'new-password', minlength: '8', required: true})),
        h('p', {className: 'form-hint'}, 'Legalább 8 karaktert adj meg.'),
        h('p', {className: 'form-error', role: 'alert'}),
        h('button', {className: 'primary-button auth-submit', type: 'submit'}, 'Aktiválom a fiókomat'),
      );
      form.addEventListener('submit', event => {
        event.preventDefault();
        const button = form.querySelector('[type=submit]');
        clearFormError(form);
        withButton(button, async () => {
          const result = await api.post('/api/auth/activate', {token, password: new FormData(form).get('password')});
          history.replaceState(null, '', '#/fiok');
          setSession(result.user, result.csrfToken);
          location.hash = result.user.role === 'teacher' ? '#/tanar' : '#/feladataim';
        }, error => showFormError(form, error));
      });
      shell(h('div', {className: 'auth-layout single-auth'}, form), '/aktivalas');
    } catch (error) { if (isCurrent(generation)) renderError(error, () => renderRoute(), '/aktivalas'); }
  }

  function renderTeacherRoute(route, signal, generation) {
    if (!requireRole('teacher', route.path)) return;
    if (route.path === '/tanar') renderTeacherDashboard(signal, generation);
    else if (route.path === '/tanar/tanulok') renderStudents(signal, generation);
    else if (route.path === '/tanar/csoportok') renderGroups(signal, generation);
    else if (route.path === '/tanar/feladatsorok') renderAssignments(route.query, signal, generation);
    else if (route.path === '/tanar/eredmenyek') renderTeacherResults(route.query, signal, generation);
  }

  async function renderTeacherDashboard(signal, generation) {
    renderLoading('A tanári áttekintés betöltése…', '/tanar');
    try {
      const [studentsData, groupsData, assignmentsData] = await Promise.all([
        api.get('/api/teacher/students', {signal}), api.get('/api/teacher/groups', {signal}), api.get('/api/teacher/assignments', {signal}),
      ]);
      if (!isCurrent(generation)) return;
      const students = studentsData.students || [], groups = groupsData.groups || [], assignments = assignmentsData.assignments || [];
      shell(h('div', {},
        schoolHero('TANÁRI MŰHELY', `Szia, ${currentUser.displayName}!`, 'Állíts össze feladatokat, és kövesd, hogyan haladnak a tanulóid.', h('a', {className: 'primary-button', href: '#/tanar/feladatsorok?uj=1'}, 'Új feladatsor')),
        h('section', {className: 'metric-grid', 'aria-label': 'Áttekintés'},
          metric('Tanuló', students.filter(student => student.active !== false).length, 'aktív'),
          metric('Csoport', groups.length, 'saját'),
          metric('Feladatsor', assignments.length, 'kiadott'),
        ),
        h('section', {className: 'quick-grid'},
          quickCard('Tanulók', 'Új tanuló felvétele, átnevezése vagy inaktiválása.', '#/tanar/tanulok', 'Tanulók kezelése'),
          quickCard('Csoportok', 'Rendezd a tanulókat könnyen kezelhető csoportokba.', '#/tanar/csoportok', 'Csoportok kezelése'),
          quickCard('Eredmények', 'Szűrd a köröket tanuló vagy feladatsor szerint.', '#/tanar/eredmenyek', 'Eredmények megnyitása'),
        ),
      ), '/tanar');
    } catch (error) { if (isCurrent(generation)) renderError(error, renderRoute, '/tanar'); }
  }

  async function renderStudents(signal, generation) {
    renderLoading('A tanulók betöltése…', '/tanar/tanulok');
    try {
      const [studentsData, groupsData] = await Promise.all([api.get('/api/teacher/students', {signal}), api.get('/api/teacher/groups', {signal})]);
      if (!isCurrent(generation)) return;
      const students = studentsData.students || [], groups = groupsData.groups || [];
      const list = h('div', {className: 'management-list'});
      const heading = sectionHeading('Tanulók', '');
      const draw = () => {
        heading.querySelector('span').textContent = `${students.length} fő`;
        list.replaceChildren(...(students.length ? students.map(student => studentEditor(student, groups, draw)) : [emptyState('Még nincs tanulód.', 'Vedd fel az első tanulót a fenti űrlapon.') ]));
      };
      draw();
      const createForm = studentCreateForm(groups, student => { students.unshift(student); draw(); });
      shell(h('div', {},
        schoolHero('TANULÓK', 'Akiket te kísérsz.', 'A létrehozott aktiváló linket kézzel add át a tanulónak. Emailt nem küldünk.'),
        createForm,
        heading,
        list,
      ), '/tanar/tanulok');
    } catch (error) { if (isCurrent(generation)) renderError(error, renderRoute, '/tanar/tanulok'); }
  }

  function studentCreateForm(groups, onCreated) {
    const form = h('form', {className: 'school-card create-card'},
      h('div', {}, h('h2', {}, 'Új tanuló'), h('p', {className: 'muted'}, 'A felhasználónév nem email cím. Legyen rövid és könnyen megjegyezhető.')),
      h('div', {className: 'form-grid'},
        field('Megjelenő név', h('input', {name: 'displayName', required: true, maxlength: '120'})),
        field('Felhasználónév', h('input', {name: 'username', required: true, maxlength: '80', autocomplete: 'off'})),
      ),
      groupChecks(groups, [], 'Kezdő csoportok'),
      h('p', {className: 'form-error', role: 'alert'}),
      h('button', {className: 'primary-button', type: 'submit'}, 'Tanuló létrehozása'),
      h('div', {className: 'link-result', hidden: true}),
    );
    form.addEventListener('submit', event => {
      event.preventDefault();
      clearFormError(form);
      const button = form.querySelector('[type=submit]');
      withButton(button, async () => {
        const values = new FormData(form);
        const result = await api.post('/api/teacher/students', {
          displayName: values.get('displayName')?.trim(), username: values.get('username')?.trim(), groupIds: values.getAll('groupIds'),
        });
        onCreated(result.student);
        showActivationLink(form.querySelector('.link-result'), result.activationToken, result.expiresAt, result.student.displayName);
        form.reset();
      }, error => showFormError(form, error));
    });
    return form;
  }

  function studentEditor(student, groups, redraw) {
    const form = h('form', {className: `school-card management-row ${student.active === false ? 'inactive' : ''}`},
      h('div', {className: 'management-main'},
        h('span', {className: 'account-avatar', 'aria-hidden': 'true'}, initials(student.displayName)),
        h('div', {}, h('strong', {}, student.displayName), h('span', {}, `@${student.username}`)),
        h('span', {className: student.active === false ? 'status-pill neutral' : 'status-pill success'}, student.active === false ? 'Inaktív' : 'Aktív'),
      ),
      h('div', {className: 'form-grid'},
        field('Megjelenő név', h('input', {name: 'displayName', value: student.displayName, required: true, maxlength: '120'})),
        h('label', {className: 'switch-field'}, h('input', {name: 'active', type: 'checkbox', checked: student.active !== false}), h('span', {}, 'Aktív fiók')),
      ),
      groupChecks(groups, student.groupIds || [], 'Csoporttagság'),
      h('p', {className: 'form-error', role: 'alert'}),
      h('div', {className: 'school-actions'},
        h('button', {className: 'primary-button', type: 'submit'}, 'Mentés'),
        h('button', {className: 'secondary-button reset-link-button', type: 'button'}, 'Új aktiváló link'),
      ),
      h('div', {className: 'link-result', hidden: true}),
    );
    form.addEventListener('submit', event => {
      event.preventDefault();
      clearFormError(form);
      withButton(form.querySelector('[type=submit]'), async () => {
        const values = new FormData(form);
        const result = await api.patch(`/api/teacher/students/${encodeURIComponent(student.id)}`, {
          displayName: values.get('displayName')?.trim(), active: values.has('active'), groupIds: values.getAll('groupIds'),
        });
        Object.assign(student, result.student);
        redraw();
      }, error => showFormError(form, error));
    });
    const reset = form.querySelector('.reset-link-button');
    reset.addEventListener('click', () => withButton(reset, async () => {
      const result = await api.post(`/api/teacher/students/${encodeURIComponent(student.id)}/reset`, {});
      showActivationLink(form.querySelector('.link-result'), result.activationToken, result.expiresAt, student.displayName);
    }, error => showFormError(form, error)));
    return form;
  }

  async function renderGroups(signal, generation) {
    renderLoading('A csoportok betöltése…', '/tanar/csoportok');
    try {
      const [groupsData, studentsData] = await Promise.all([api.get('/api/teacher/groups', {signal}), api.get('/api/teacher/students', {signal})]);
      if (!isCurrent(generation)) return;
      const groups = groupsData.groups || [], students = studentsData.students || [];
      const list = h('div', {className: 'management-list'});
      const heading = sectionHeading('Csoportok', '');
      const draw = () => {
        heading.querySelector('span').textContent = `${groups.length} csoport`;
        list.replaceChildren(...(groups.length ? groups.map(group => groupEditor(group, students, draw)) : [emptyState('Még nincs csoport.', 'Hozd létre az elsőt a fenti űrlapon.') ]));
      };
      draw();
      const create = h('form', {className: 'school-card create-card'},
        h('h2', {}, 'Új csoport'),
        field('Csoport neve', h('input', {name: 'name', required: true, maxlength: '120'})),
        studentChecks(students, [], 'Tagok'),
        h('p', {className: 'form-error', role: 'alert'}),
        h('button', {className: 'primary-button', type: 'submit'}, 'Csoport létrehozása'),
      );
      create.addEventListener('submit', event => {
        event.preventDefault(); clearFormError(create);
        withButton(create.querySelector('[type=submit]'), async () => {
          const values = new FormData(create);
          const result = await api.post('/api/teacher/groups', {name: values.get('name')?.trim(), studentIds: values.getAll('studentIds')});
          groups.unshift(result.group); create.reset(); draw();
        }, error => showFormError(create, error));
      });
      shell(h('div', {}, schoolHero('CSOPORTOK', 'Együtt könnyebb szervezni.', 'Egy tanuló több csoport tagja is lehet.'), create, heading, list), '/tanar/csoportok');
    } catch (error) { if (isCurrent(generation)) renderError(error, renderRoute, '/tanar/csoportok'); }
  }

  function groupEditor(group, students, redraw) {
    const form = h('form', {className: 'school-card group-card'},
      h('div', {className: 'group-card-head'}, h('span', {className: 'group-icon', 'aria-hidden': 'true'}, '◎'), h('div', {}, h('h2', {}, group.name), h('p', {className: 'muted'}, `${(group.studentIds || []).length} tag`))),
      field('Csoport neve', h('input', {name: 'name', value: group.name, required: true, maxlength: '120'})),
      studentChecks(students, group.studentIds || [], 'Tagok'),
      h('p', {className: 'form-error', role: 'alert'}),
      h('button', {className: 'primary-button', type: 'submit'}, 'Változások mentése'),
    );
    form.addEventListener('submit', event => {
      event.preventDefault(); clearFormError(form);
      withButton(form.querySelector('[type=submit]'), async () => {
        const values = new FormData(form);
        const result = await api.patch(`/api/teacher/groups/${encodeURIComponent(group.id)}`, {name: values.get('name')?.trim(), studentIds: values.getAll('studentIds')});
        Object.assign(group, result.group); redraw();
      }, error => showFormError(form, error));
    });
    return form;
  }

  async function renderAssignments(query, signal, generation) {
    renderLoading('A feladatsorok betöltése…', '/tanar/feladatsorok');
    try {
      const detailId = query.get('id');
      if (detailId) {
        const data = await api.get(`/api/teacher/assignments/${encodeURIComponent(detailId)}`, {signal});
        if (isCurrent(generation)) drawAssignmentDetail(data);
        return;
      }
      const [assignmentsData, studentsData, groupsData] = await Promise.all([
        api.get('/api/teacher/assignments', {signal}), api.get('/api/teacher/students', {signal}), api.get('/api/teacher/groups', {signal}),
      ]);
      if (!isCurrent(generation)) return;
      if (query.get('uj') === '1') drawAssignmentBuilder(studentsData.students || [], groupsData.groups || []);
      else drawAssignmentList(assignmentsData.assignments || []);
    } catch (error) { if (isCurrent(generation)) renderError(error, renderRoute, '/tanar/feladatsorok'); }
  }

  function drawAssignmentList(assignments) {
    const list = assignments.length ? h('div', {className: 'assignment-list'}, assignments.map(assignment => {
      const progress = assignment.completed != null && assignment.total != null ? `${assignment.completed} / ${assignment.total} kör` : `${(assignment.steps || []).length} lépés`;
      return h('a', {className: 'school-card assignment-card', href: `#/tanar/feladatsorok?id=${encodeURIComponent(assignment.id)}`},
        h('div', {}, h('span', {className: 'eyebrow'}, assignment.dueAt ? `HATÁRIDŐ: ${formatDate(assignment.dueAt)}` : 'NINCS HATÁRIDŐ'), h('h2', {}, assignment.title), assignment.instructions ? h('p', {}, assignment.instructions) : null),
        h('div', {className: 'assignment-card-meta'}, h('strong', {}, progress), h('span', {'aria-hidden': 'true'}, '→')),
      );
    })) : emptyState('Még nincs feladatsor.', 'Állíts össze több játékból és ismétlésből egy követhető gyakorlást.', h('a', {className: 'primary-button', href: '#/tanar/feladatsorok?uj=1'}, 'Első feladatsor'));
    shell(h('div', {}, schoolHero('FELADATSOROK', 'Gyakorlás, lépésről lépésre.', 'Minden lépéshez valódi játékszintet és külön ismétlésszámot adhatsz meg.', h('a', {className: 'primary-button', href: '#/tanar/feladatsorok?uj=1'}, 'Új feladatsor')), list), '/tanar/feladatsorok');
  }

  function drawAssignmentBuilder(students, groups) {
    const stepsRoot = h('div', {className: 'steps-builder'});
    let requestKey = null;
    const form = h('form', {className: 'assignment-builder'},
      h('a', {className: 'back-link', href: '#/tanar/feladatsorok'}, '← Feladatsorok'),
      schoolHero('ÚJ FELADATSOR', 'Rakd össze a gyakorlást.', 'Válaszd ki a címzetteket, majd add hozzá a játékokat a kívánt sorrendben.'),
      h('section', {className: 'school-card builder-section'},
        h('span', {className: 'step-number'}, '1'), h('div', {className: 'builder-content'},
          h('h2', {}, 'Alapadatok'),
          field('Cím', h('input', {name: 'title', required: true, maxlength: '120', placeholder: 'Például: Pénteki memóriakör'})),
          field('Rövid útmutató (nem kötelező)', h('textarea', {name: 'instructions', maxlength: '1000', rows: '3', placeholder: 'Mire figyeljenek a tanulók?'})),
          field('Határidő (nem kötelező)', h('input', {name: 'dueAt', type: 'datetime-local'})),
        ),
      ),
      h('section', {className: 'school-card builder-section'},
        h('span', {className: 'step-number'}, '2'), h('div', {className: 'builder-content'},
          h('h2', {}, 'Címzettek'),
          h('p', {className: 'muted'}, 'Válassz legalább egy tanulót vagy csoportot. A csoporttagság a kiosztás pillanatában rögzül.'),
          h('div', {className: 'recipient-columns'}, studentChecks(students.filter(s => s.active !== false), [], 'Tanulók'), groupChecks(groups, [], 'Csoportok')),
        ),
      ),
      h('section', {className: 'school-card builder-section'},
        h('span', {className: 'step-number'}, '3'), h('div', {className: 'builder-content'},
          h('div', {className: 'section-title'}, h('div', {}, h('h2', {}, 'Lépések'), h('p', {className: 'muted'}, '1–20 játék, lépésenként 1–10 ismétlés.')), h('button', {className: 'secondary-button add-step', type: 'button'}, '+ Játék hozzáadása')),
          stepsRoot,
        ),
      ),
      h('p', {className: 'form-error submit-error', role: 'alert'}),
      h('div', {className: 'builder-submit'}, h('a', {className: 'secondary-button', href: '#/tanar/feladatsorok'}, 'Mégsem'), h('button', {className: 'primary-button', type: 'submit'}, 'Feladatsor kiosztása')),
    );
    const add = () => { if (stepsRoot.children.length < 20) { requestKey = null; stepsRoot.append(stepEditor(stepsRoot.children.length)); } };
    form.querySelector('.add-step').addEventListener('click', add);
    form.addEventListener('input', () => { requestKey = null; });
    form.addEventListener('change', () => { requestKey = null; });
    add();
    form.addEventListener('submit', event => {
      event.preventDefault(); clearFormError(form);
      const values = new FormData(form);
      if (!values.getAll('studentIds').length && !values.getAll('groupIds').length) { showFormError(form, new Error('Válassz legalább egy tanulót vagy csoportot.')); return; }
      const steps = [...stepsRoot.querySelectorAll('.step-editor')].map(readStep);
      const due = values.get('dueAt');
      requestKey ||= makeIdempotencyKey();
      withButton(form.querySelector('[type=submit]'), async () => {
        const result = await api.post('/api/teacher/assignments', {
          title: values.get('title')?.trim(), instructions: values.get('instructions')?.trim() || undefined,
          dueAt: due ? new Date(due).toISOString() : undefined,
          studentIds: values.getAll('studentIds'), groupIds: values.getAll('groupIds'), steps,
        }, {headers: {'Idempotency-Key': requestKey}});
        location.hash = `#/tanar/feladatsorok?id=${encodeURIComponent(result.assignment.id)}`;
      }, error => showFormError(form, error));
    });
    shell(form, '/tanar/feladatsorok');
  }

  function stepEditor(index) {
    const gameSelect = h('select', {name: 'gameId', 'aria-label': `${index + 1}. lépés játéka`}, games.map(game => h('option', {value: game.id}, game.title)));
    const settingsRoot = h('div', {className: 'step-settings'});
    const card = h('article', {className: 'step-editor'},
      h('div', {className: 'step-editor-head'}, h('strong', {className: 'step-title'}, `${index + 1}. lépés`), h('button', {type: 'button', className: 'text-link remove-step'}, 'Eltávolítás')),
      field('Játék', gameSelect), settingsRoot,
      field('Ismétlések', h('input', {name: 'repetitions', type: 'number', min: '1', max: '10', value: '1', required: true})),
    );
    const refreshSettings = () => settingsRoot.replaceChildren(...settingFields(games.find(game => game.id === gameSelect.value)));
    gameSelect.addEventListener('change', refreshSettings); refreshSettings();
    card.querySelector('.remove-step').addEventListener('click', () => {
      if (card.parentElement.children.length === 1) return;
      const parent = card.parentElement;
      card.remove(); renumberSteps(parent);
      parent.dispatchEvent(new Event('input', {bubbles: true}));
    });
    return card;
  }

  function settingFields(game) {
    if (!game) return [];
    const rule = GAME_RULES[game.id] || {};
    const levels = gameLevels(game);
    const levelSelect = h('select', {name: 'level'}, levels.map(level => h('option', {value: String(level.value)}, level.label)));
    const ruleText = h('p', {className: 'level-rule'});
    const activeSettings = h('div', {className: 'active-step-settings'});
    const draft = {};
    const redraw = () => {
      activeSettings.querySelectorAll('[name]').forEach(input => { draft[input.name] = input.type === 'checkbox' ? input.checked : input.value; });
      const level = Number(levelSelect.value) || COMMON_GAME_SETTINGS.levelDefault;
      const levelInfo = levels.find(item => item.value === level);
      ruleText.textContent = levelRuleText(game, level, levelInfo);
      activeSettings.replaceChildren(...activeSettingFields(game, rule, level, draft));
    };
    levelSelect.addEventListener('change', redraw);
    redraw();
    return [field('Játékszint', levelSelect), ruleText, activeSettings];
  }

  function activeSettingFields(game, rule, level, draft) {
    const fields = [];
    const [secondsMin, secondsMax, secondsStep, secondsDefault] = [
      COMMON_GAME_SETTINGS.seconds.min, COMMON_GAME_SETTINGS.seconds.max,
      COMMON_GAME_SETTINGS.seconds.step, COMMON_GAME_SETTINGS.seconds.default,
    ];
    const selectedSeconds = Number(draft.seconds) || secondsDefault;
    fields.push(field(game.id === 'path' ? 'Lejátszási idő' : 'Megjegyzési idő', h('select', {name: 'seconds'},
      numericRange(secondsMin, secondsMax, secondsStep).map(value => h('option', {value: String(value), selected: value === selectedSeconds}, `${value} mp`)),
    )));

    if (Array.isArray(rule.count) && !(game.id === 'stations' && level === 2)) {
      const [min, max] = rule.count;
      const selectedCount = Math.max(min, Math.min(max, Number(draft.count) || 5));
      fields.push(field(game.countLabel || 'Elemszám', h('select', {name: 'count'}, numericRange(min, max).map(value => h('option', {value: String(value), selected: value === selectedCount}, String(value))))));
    }
    if (usesDifficulty(game.id, level)) {
      const options = difficultyOptions(game.id);
      const selectedDifficulty = options.some(option => option.value === draft.difficulty) ? draft.difficulty : 'normal';
      fields.push(field(game.id === 'prices' ? 'Nehézség' : 'Képi nehézség', h('select', {name: 'difficulty'}, options.map(({value, label}) => h('option', {value, selected: value === selectedDifficulty}, label)))));
    }
    if (Array.isArray(rule.themes) && level === 1) {
      const labels = {stations: 'Megállók', streets: 'Utcák'};
      fields.push(field('Téma', h('select', {name: 'theme'}, rule.themes.map(value => h('option', {value, selected: value === draft.theme}, labels[value] || value)))));
    }
    if (Array.isArray(rule.symbolSets)) {
      const labels = {objects: 'Tárgyak', abstract: 'Absztrakt jelek'};
      fields.push(field('Jelkészlet', h('select', {name: 'symbolSet'}, rule.symbolSets.map(value => h('option', {value, selected: value === draft.symbolSet}, labels[value] || value)))));
    }
    if (Array.isArray(rule.rounds)) {
      const [min, max] = rule.rounds;
      const selectedRounds = Math.max(min, Math.min(max, Number(draft.rounds) || COMMON_GAME_SETTINGS.roundsDefault));
      fields.push(field('Válaszkörök', h('select', {name: 'rounds'}, numericRange(min, max).map(value => h('option', {value: String(value), selected: value === selectedRounds}, String(value))))));
    }
    if (game.reverse) fields.push(h('label', {className: 'switch-field compact-switch'}, h('input', {name: 'reverse', type: 'checkbox', checked: draft.reverse === true}), h('span', {}, 'Fordított sorrend')));
    return fields;
  }

  function readStep(node) {
    const settings = {};
    node.querySelectorAll('[name]').forEach(input => {
      if (input.name === 'gameId' || input.name === 'repetitions') return;
      if (input.type === 'checkbox') settings[input.name] = input.checked;
      else if (input.type === 'number' || input.name === 'level' || input.name === 'seconds') settings[input.name] = Number(input.value);
      else settings[input.name] = input.value;
    });
    const gameId = node.querySelector('[name=gameId]').value;
    return {gameId, settings: normalizeGameSettings(gameId, settings), repetitions: Number(node.querySelector('[name=repetitions]').value)};
  }

  function drawAssignmentDetail(data) {
    const assignment = data.assignment, students = data.students || [], results = data.results || [];
    const studentRows = students.length ? h('div', {className: 'progress-table'}, students.map(student => h('div', {className: 'progress-row'},
      h('div', {}, h('strong', {}, student.displayName), h('span', {}, `${student.completed || 0} / ${student.total || 0} kör`)),
      progressBar(student.total ? Math.round((student.completed || 0) / student.total * 100) : 0),
      h('a', {className: 'text-link', href: `#/tanar/eredmenyek?studentId=${encodeURIComponent(student.id)}&assignmentId=${encodeURIComponent(assignment.id)}`}, 'Eredmények'),
    ))) : emptyState('Még nincs címzett.', 'Ehhez a feladatsorhoz nem tartozik tanuló.');
    shell(h('div', {},
      h('a', {className: 'back-link', href: '#/tanar/feladatsorok'}, '← Feladatsorok'),
      h('section', {className: 'school-hero compact-school-hero'}, h('span', {className: 'eyebrow'}, assignment.dueAt ? `HATÁRIDŐ: ${formatDate(assignment.dueAt)}` : 'FELADATSOR'), h('h1', {}, assignment.title), assignment.instructions ? h('p', {}, assignment.instructions) : null),
      h('section', {className: 'school-card'}, h('h2', {}, 'Lépések'), h('ol', {className: 'assignment-steps'}, (assignment.steps || []).map(step => h('li', {}, h('strong', {}, gameName(step.gameId)), h('span', {}, `${levelName(step.gameId, step.settings?.level)} · ${step.repetitions} ismétlés`))))),
      sectionHeading('Tanulói haladás', `${results.length} eredmény`), studentRows,
    ), '/tanar/feladatsorok');
  }

  async function renderTeacherResults(query, signal, generation) {
    renderLoading('Az eredmények betöltése…', '/tanar/eredmenyek');
    try {
      const detailId = query.get('result');
      if (detailId) {
        const data = await api.get(`/api/teacher/results/${encodeURIComponent(detailId)}`, {signal});
        if (isCurrent(generation)) drawResultDetail(data.result);
        return;
      }
      const studentId = query.get('studentId') || '', assignmentId = query.get('assignmentId') || '';
      const resultQuery = new URLSearchParams();
      if (studentId) resultQuery.set('studentId', studentId);
      if (assignmentId) resultQuery.set('assignmentId', assignmentId);
      const [resultsData, studentsData, assignmentsData] = await Promise.all([
        api.get(`/api/teacher/results${resultQuery.size ? `?${resultQuery}` : ''}`, {signal}),
        api.get('/api/teacher/students', {signal}), api.get('/api/teacher/assignments', {signal}),
      ]);
      if (!isCurrent(generation)) return;
      drawTeacherResultList(resultsData.results || [], studentsData.students || [], assignmentsData.assignments || [], studentId, assignmentId);
    } catch (error) { if (isCurrent(generation)) renderError(error, renderRoute, '/tanar/eredmenyek'); }
  }

  function drawTeacherResultList(results, students, assignments, studentId, assignmentId) {
    const filter = h('form', {className: 'school-card result-filters'},
      field('Tanuló', h('select', {name: 'studentId'}, h('option', {value: ''}, 'Minden tanuló'), students.map(student => h('option', {value: student.id, selected: student.id === studentId}, student.displayName)))),
      field('Feladatsor', h('select', {name: 'assignmentId'}, h('option', {value: ''}, 'Minden feladatsor'), assignments.map(assignment => h('option', {value: assignment.id, selected: assignment.id === assignmentId}, assignment.title)))),
      h('button', {className: 'secondary-button', type: 'submit'}, 'Szűrés'),
    );
    filter.addEventListener('submit', event => {
      event.preventDefault(); const values = new FormData(filter), params = new URLSearchParams();
      if (values.get('studentId')) params.set('studentId', values.get('studentId'));
      if (values.get('assignmentId')) params.set('assignmentId', values.get('assignmentId'));
      location.hash = `#/tanar/eredmenyek${params.size ? `?${params}` : ''}`;
    });
    const studentMap = new Map(students.map(s => [s.id, s.displayName]));
    const list = results.length ? h('div', {className: 'results-list'}, results.map(result => resultRow(result, studentMap.get(result.studentId) || result.studentDisplayName || 'Tanuló', true))) : emptyState('Nincs eredmény ehhez a szűréshez.', 'Módosítsd a szűrőket, vagy térj vissza később.');
    shell(h('div', {}, schoolHero('EREDMÉNYEK', 'Minden kör mögött ott a válasz.', 'Nyisd meg az eredményt a szerver által számolt pontok és a válaszonkénti részletek megtekintéséhez.'), filter, sectionHeading('Körök', `${results.length} találat`), list), '/tanar/eredmenyek');
  }

  function drawResultDetail(result) {
    const details = Array.isArray(result.details) ? result.details : [];
    shell(h('div', {},
      h('a', {className: 'back-link', href: '#/tanar/eredmenyek'}, '← Eredmények'),
      h('section', {className: 'school-hero compact-school-hero'}, h('span', {className: 'eyebrow'}, formatDate(result.at)), h('h1', {}, `${gameName(result.gameId)} · ${result.percent}%`), h('p', {}, result.summary || `${result.correct} / ${result.total} helyes válasz`)),
      h('section', {className: 'school-card answer-review'},
        h('h2', {}, 'Válaszonkénti áttekintés'),
        details.length ? h('div', {className: 'answer-review-list'}, details.map((detail, index) => h('article', {className: `review-answer ${detail.correct ? 'correct' : 'incorrect'}`},
          h('span', {className: 'review-mark', 'aria-label': detail.correct ? 'Helyes' : 'Hibás'}, detail.correct ? '✓' : '×'),
          h('div', {}, h('strong', {}, detail.label || `${index + 1}. válasz`), h('p', {}, `Válasz: ${displayValue(detail.actual)}`), detail.correct ? null : h('p', {}, `Helyes megoldás: ${displayValue(detail.expected)}`)),
        ))) : h('p', {className: 'muted'}, 'Ehhez a körhöz nincs válaszonkénti részlet.'),
        result.answer !== undefined ? h('details', {className: 'raw-answer'}, h('summary', {}, 'Beküldött nyers válasz'), h('pre', {}, safeJson(result.answer))) : null,
      ),
    ), '/tanar/eredmenyek');
  }

  async function renderStudentAssignments(signal, generation) {
    if (!requireRole('student', '/feladataim')) return;
    renderLoading('A feladataid betöltése…', '/feladataim');
    try {
      const data = await api.get('/api/student/assignments', {signal});
      if (!isCurrent(generation)) return;
      const assignments = data.assignments || [];
      const list = assignments.length ? h('div', {className: 'student-assignment-list'}, assignments.map(studentAssignmentCard)) : emptyState('Most nincs kiosztott feladatod.', 'Addig is választhatsz a szabad gyakorlatok közül.', h('button', {className: 'primary-button', onClick: () => renderPractice()}, 'Szabad gyakorlás'));
      shell(h('div', {}, schoolHero('FELADATAIM', `Szia, ${currentUser.displayName}!`, 'Innen pontosan a tanár által kiválasztott játékszintet indíthatod.', h('button', {className: 'secondary-button', onClick: () => renderPractice()}, 'Szabad gyakorlás')), list), '/feladataim');
    } catch (error) { if (isCurrent(generation)) renderError(error, renderRoute, '/feladataim'); }
  }

  function studentAssignmentCard(assignment) {
    const percent = assignment.total ? Math.round((assignment.completed || 0) / assignment.total * 100) : 0;
    return h('article', {className: 'school-card student-assignment'},
      h('div', {className: 'student-assignment-head'},
        h('div', {}, h('span', {className: 'eyebrow'}, assignment.dueAt ? `HATÁRIDŐ: ${formatDate(assignment.dueAt)}` : 'SAJÁT TEMPÓBAN'), h('h2', {}, assignment.title), assignment.instructions ? h('p', {}, assignment.instructions) : null),
        h('strong', {className: 'assignment-percent'}, `${percent}%`),
      ),
      progressBar(percent),
      h('ol', {className: 'student-steps'}, (assignment.steps || []).map(step => {
        const complete = Number(step.completed || 0) >= Number(step.repetitions || 0);
        const button = h('button', {className: complete ? 'secondary-button' : 'primary-button', disabled: complete}, complete ? 'Kész' : 'Indítás');
        button.addEventListener('click', () => onPlay?.(step.gameId, {...step.settings}, {assignmentStepId: step.id, assignmentId: assignment.id}));
        return h('li', {}, h('span', {className: `step-state ${complete ? 'done' : ''}`, 'aria-hidden': 'true'}, complete ? '✓' : '○'), h('div', {}, h('strong', {}, gameName(step.gameId)), h('span', {}, `${levelName(step.gameId, step.settings?.level)} · ${step.completed || 0} / ${step.repetitions} kör`)), button);
      })),
    );
  }

  async function renderStudentProgress(signal, generation) {
    if (!requireRole('student', '/haladas')) return;
    renderLoading('A haladásod betöltése…', '/haladas');
    try {
      const [progress, resultsData] = await Promise.all([api.get('/api/progress', {signal}), api.get('/api/results', {signal})]);
      if (!isCurrent(generation)) return;
      const results = resultsData.results || [];
      shell(h('div', {},
        schoolHero('HALADÁSOM', progress.rank || 'Kezdő', 'Minden befejezett kör hozzáad valamit a gyakorlásodhoz.'),
        h('section', {className: 'metric-grid'}, metric('Befejezett kör', progress.rounds || 0, 'összesen'), metric('Pontosság', `${progress.percent || 0}%`, `${progress.correct || 0} / ${progress.total || 0}`), metric('Csillag', progress.stars || 0, 'összesen')),
        h('section', {className: 'rank-card school-card'},
          h('div', {className: 'rank-orbit', 'aria-hidden': 'true'}, '✦'),
          h('div', {}, h('span', {className: 'eyebrow'}, 'RANG'), h('h2', {}, progress.rank || 'Kezdő'), h('p', {}, rankHint(progress.stars || 0))),
        ),
        sectionHeading('Játékok és szintek', `${(progress.games || []).length} teljesített mód`),
        (progress.games || []).length ? h('div', {className: 'game-progress-grid'}, progress.games.map(item => h('article', {className: 'school-card game-progress-card'}, h('h3', {}, gameName(item.gameId)), h('span', {}, levelName(item.gameId, item.level)), h('strong', {}, `${item.bestPercent}%`), h('small', {}, `${item.rounds} kör`)))) : emptyState('Az első kör még előtted van.', 'Indíts el egy feladatot vagy válassz szabad gyakorlatot.'),
        sectionHeading('Legutóbbi eredmények', `${results.length} kör`),
        results.length ? h('div', {className: 'results-list'}, results.slice(0, 30).map(result => resultRow(result, null, false))) : emptyState('Még nincs eredményed.', 'Az eredmények egy befejezett kör után jelennek meg.'),
      ), '/haladas');
    } catch (error) { if (isCurrent(generation)) renderError(error, renderRoute, '/haladas'); }
  }

  function resultRow(result, studentName, teacherView) {
    const content = [
      h('span', {className: `score-dot ${scoreClass(result.percent)}`}, `${result.percent}%`),
      h('div', {className: 'result-row-main'}, h('strong', {}, gameName(result.gameId)), h('span', {}, `${studentName ? `${studentName} · ` : ''}${formatDate(result.at)} · ${levelName(result.gameId, result.settings?.level)}`)),
      h('span', {className: 'result-ratio'}, `${result.correct} / ${result.total}`),
      teacherView ? h('span', {className: 'row-arrow', 'aria-hidden': 'true'}, '→') : null,
    ];
    return teacherView ? h('a', {className: 'school-card result-row', href: `#/tanar/eredmenyek?result=${encodeURIComponent(result.id)}`}, content) : h('article', {className: 'school-card result-row'}, content);
  }

  function field(label, control) { return h('label', {className: 'school-field'}, h('span', {}, label), control); }
  function noticeNode(text) { return text ? h('p', {className: 'form-notice', role: 'status'}, text) : null; }
  function schoolHero(eyebrow, title, description, action) { return h('section', {className: 'school-hero'}, h('div', {}, h('span', {className: 'eyebrow'}, eyebrow), h('h1', {}, title), h('p', {}, description)), action || null); }
  function sectionHeading(title, side) { return h('div', {className: 'school-section-title'}, h('h2', {}, title), h('span', {}, side)); }
  function metric(label, value, suffix) { return h('div', {className: 'metric-card'}, h('span', {}, label), h('strong', {}, value), h('small', {}, suffix)); }
  function quickCard(title, text, href, link) { return h('a', {className: 'school-card quick-card', href}, h('span', {className: 'quick-symbol', 'aria-hidden': 'true'}, '↗'), h('h2', {}, title), h('p', {}, text), h('strong', {}, `${link} →`)); }
  function emptyState(title, text, action) { return h('div', {className: 'school-empty'}, h('span', {className: 'empty-symbol', 'aria-hidden': 'true'}, '◎'), h('h2', {}, title), h('p', {}, text), action || null); }
  function progressBar(percent) { return h('div', {className: 'school-progress', role: 'progressbar', 'aria-valuenow': String(percent), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': `${percent}% kész`}, h('span', {style: {width: `${Math.max(0, Math.min(100, percent))}%`}})); }

  function checklist(items, selected, legend, itemName, valueName) {
    const chosen = new Set(selected || []);
    return h('fieldset', {className: 'checklist'}, h('legend', {}, legend), items.length ? h('div', {className: 'checklist-items'}, items.map(item => h('label', {}, h('input', {type: 'checkbox', name: valueName, value: item.id, checked: chosen.has(item.id), disabled: item.active === false}), h('span', {}, itemName(item), item.active === false ? h('small', {}, 'Inaktív') : null)))) : h('p', {className: 'muted'}, 'Nincs választható elem.'));
  }
  function studentChecks(students, selected, legend) { return checklist(students, selected, legend, student => student.displayName, 'studentIds'); }
  function groupChecks(groups, selected, legend) { return checklist(groups, selected, legend, group => `${group.name}${group.studentIds ? ` (${group.studentIds.length})` : ''}`, 'groupIds'); }

  function showActivationLink(container, token, expiresAt, displayName) {
    const url = new URL(location.href);
    url.hash = `/aktivalas?token=${encodeURIComponent(token)}`;
    const input = h('input', {value: url.href, readOnly: true, 'aria-label': `${displayName} aktiváló linkje`});
    const copy = h('button', {type: 'button', className: 'secondary-button'}, 'Link másolása');
    const status = h('span', {className: 'copy-status', role: 'status'});
    copy.addEventListener('click', () => withButton(copy, async () => {
      await navigator.clipboard.writeText(input.value);
      status.textContent = 'Kimásolva.';
    }, () => { input.focus(); input.select(); status.textContent = 'Jelöld ki és másold ki a linket.'; }));
    container.hidden = false;
    container.replaceChildren(h('strong', {}, `${displayName} aktiváló linkje`), h('p', {}, `Érvényes: ${formatDate(expiresAt)}. A link egyszer használható.`), h('div', {className: 'copy-row'}, input, copy), status);
    input.focus(); input.select();
  }

  function gameLevels(game) {
    if (Array.isArray(game?.levels) && game.levels.length) return game.levels.map(level => ({...level, value: Number(level.value), label: level.label || `${level.value}. szint`}));
    const count = FALLBACK_LEVELS[game?.id] || 1;
    return Array.from({length: count}, (_, index) => ({value: index + 1, label: `${index + 1}. szint`}));
  }
  function levelRuleText(game, level, levelInfo) {
    const details = [];
    if (levelInfo?.description) details.push(levelInfo.description);
    const rule = GAME_RULES[game.id] || {};
    if (game.id === 'stations' && level === 2) details.push(`Rögzített hossz: ${rule.level2Count} mondat; téma nem választható.`);
    if (game.id === 'code' && rule.messageLengths?.[level]) details.push(`Minden üzenet ${rule.messageLengths[level]} jegyű.`);
    if (game.id === 'picture' && level === 2) details.push('A képsorrend szintnek nincs külön képi nehézsége.');
    return details.join(' ');
  }
  function usesDifficulty(gameId, level) { return gameId === 'grid' || gameId === 'prices' || (gameId === 'picture' && level === 1); }
  function difficultyOptions(gameId) {
    const labels = {easy: 'Könnyű', normal: 'Normál', hard: 'Kihívás'};
    const activeValues = gameId === 'grid' ? ['easy', 'normal'] : gameId === 'picture' ? ['normal', 'hard'] : COMMON_GAME_SETTINGS.difficulty;
    const activeLabels = gameId === 'grid' ? {easy: 'Kisebb rács', normal: 'Nagyobb rács'} : gameId === 'picture' ? {normal: 'Alap képkészlet', hard: 'Bővített képkészlet'} : labels;
    return COMMON_GAME_SETTINGS.difficulty.filter(value => activeValues.includes(value)).map(value => ({value, label: activeLabels[value] || labels[value] || value}));
  }
  function numericRange(min, max, step = 1) { const values = []; for (let value = min; value <= max; value += step) values.push(value); return values; }
  function levelName(gameId, value = 1) { return gameLevels(games.find(game => game.id === gameId)).find(level => level.value === Number(value))?.label || `${Number(value) || 1}. szint`; }
  function gameName(id) { return games.find(game => game.id === id)?.title || id || 'Ismeretlen játék'; }
  function initials(name) { return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toLocaleUpperCase('hu')).join(''); }
  function formatDate(value) { if (!value) return '–'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '–' : date.toLocaleString('hu-HU', {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}); }
  function displayValue(value) { if (value === null || value === undefined || value === '') return '–'; if (typeof value === 'object') return safeJson(value); return String(value); }
  function safeJson(value) { try { return JSON.stringify(value, null, 2); } catch { return 'Nem megjeleníthető válasz'; } }
  function scoreClass(percent) { return percent === 100 ? 'excellent' : percent >= 60 ? 'good' : percent > 0 ? 'started' : 'empty'; }
  function rankHint(stars) { if (stars < 10) return `${10 - stars} csillag a Felfedező rangig.`; if (stars < 30) return `${30 - stars} csillag a Gyakorló rangig.`; if (stars < 60) return `${60 - stars} csillag az Emlékmester rangig.`; return 'Elérted az Emlékmester rangot.'; }
  function makeIdempotencyKey() { return globalThis.crypto?.randomUUID?.() || `assignment-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function renumberSteps(root) { [...root.children].forEach((step, index) => { step.querySelector('.step-title').textContent = `${index + 1}. lépés`; }); }

  function clearFormError(form) { const node = form.querySelector('.form-error'); if (node) node.textContent = ''; }
  function showFormError(form, error) { const node = form.querySelector('.form-error'); if (node) node.textContent = error?.message || 'A mentés most nem sikerült.'; }
  function renderInlineError(near) { return error => { let node = near.parentElement?.querySelector('.form-error'); if (!node) { node = h('p', {className: 'form-error', role: 'alert'}); near.parentElement?.append(node); } node.textContent = error?.message || 'A művelet most nem sikerült.'; }; }
  async function withButton(button, action, onError = () => {}) {
    if (button.disabled) return;
    const label = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try { await action(); }
    catch (error) { onError(error); }
    finally { button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = label; }
  }

  return {
    init,
    renderRoute,
    get user() { return currentUser; },
    get csrf() { return csrfToken; },
    get supported() { return supported; },
    api,
    renderNav,
    renderFooter,
    refresh,
  };
}
