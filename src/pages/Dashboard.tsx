import { FormEvent, useEffect, useMemo, useState } from 'react';

type Credentials = {
  username: string;
  password: string;
};

type Overview = {
  accesses?: number;
  whatsappClicks?: number;
  conversionRate?: number;
};

type Comparison = {
  previousAccesses?: number;
  previousWhatsappClicks?: number;
  deltaAccesses?: number;
  deltaWhatsappClicks?: number;
  deltaConversionRate?: number;
};

type HourPoint = { hour: string; accesses?: number; clicks?: number };
type DayPoint = { day: string; accesses?: number; clicks?: number };
type RankingPoint = { lp: string; accesses?: number; clicks?: number; conversionRate?: number };
type StatePoint = { state: string; clicks?: number };
type PhonePoint = { phone: string; clicks?: number };

type AnalyticsResponse = {
  overview?: Overview;
  comparison?: Comparison;
  byHour?: HourPoint[];
  byDay?: DayPoint[];
  ranking?: RankingPoint[];
  byState?: StatePoint[];
  byPhone?: PhonePoint[];
};

type Filters = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  lp: string;
};

const SESSION_KEY = 'dashboard_admin_session_v1';

function setRobotsNoIndex() {
  const meta = document.querySelector('meta[name="robots"]') ?? document.createElement('meta');
  meta.setAttribute('name', 'robots');
  meta.setAttribute('content', 'noindex, nofollow');
  if (!meta.parentElement) {
    document.head.appendChild(meta);
  }
}

function formatNumber(value?: number) {
  return new Intl.NumberFormat('pt-BR').format(value ?? 0);
}

function formatPercent(value?: number) {
  return `${(value ?? 0).toFixed(2)}%`;
}

function toQuery(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.startTime) params.set('startTime', filters.startTime);
  if (filters.endTime) params.set('endTime', filters.endTime);
  if (filters.lp) params.set('lp', filters.lp);
  return params.toString();
}

export default function Dashboard() {
  const [credentials, setCredentials] = useState<Credentials>({ username: '', password: '' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string>('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [data, setData] = useState<AnalyticsResponse>({});
  const [filters, setFilters] = useState<Filters>({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    lp: '',
  });

  const lpOptions = useMemo(() => {
    const names = new Set((data.ranking ?? []).map((item) => item.lp).filter(Boolean));
    return Array.from(names);
  }, [data.ranking]);

  useEffect(() => {
    setRobotsNoIndex();

    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Credentials;
      if (parsed.username && parsed.password) {
        setCredentials(parsed);
        pingAuth(parsed);
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pingAuth(current: Credentials) {
    setLoadingAuth(true);
    setAuthError('');

    try {
      const response = await fetch('/functions/v1/admin-update-config', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Basic ${btoa(`${current.username}:${current.password}`)}`,
        },
        body: JSON.stringify({ action: 'ping' }),
      });

      if (!response.ok) {
        throw new Error('Credenciais inválidas.');
      }

      setIsAuthenticated(true);
      localStorage.setItem(SESSION_KEY, JSON.stringify(current));
      await loadAnalytics(current, filters);
    } catch (error) {
      setIsAuthenticated(false);
      setAuthError(error instanceof Error ? error.message : 'Falha de autenticação.');
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setLoadingAuth(false);
    }
  }

  async function loadAnalytics(current: Credentials, selectedFilters: Filters) {
    setLoadingData(true);
    try {
      const query = toQuery(selectedFilters);
      const response = await fetch(`/functions/v1/get-analytics${query ? `?${query}` : ''}`, {
        method: 'GET',
        headers: {
          authorization: `Basic ${btoa(`${current.username}:${current.password}`)}`,
        },
      });

      if (!response.ok) {
        throw new Error('Não foi possível carregar os dados de analytics.');
      }

      const payload = (await response.json()) as AnalyticsResponse;
      setData(payload);
    } catch {
      setData({});
    } finally {
      setLoadingData(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await pingAuth(credentials);
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setData({});
  }

  async function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadAnalytics(credentials, filters);
  }

  if (!isAuthenticated) {
    return (
      <main style={{ maxWidth: 420, margin: '56px auto', padding: 24 }}>
        <h1>Dashboard</h1>
        <p>Entre com as mesmas credenciais do admin.</p>
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 12 }}>
          <input
            type="text"
            placeholder="Usuário"
            value={credentials.username}
            onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={credentials.password}
            onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
          <button type="submit" disabled={loadingAuth}>
            {loadingAuth ? 'Entrando...' : 'Entrar'}
          </button>
          {authError ? <small style={{ color: '#b00020' }}>{authError}</small> : null}
        </form>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, display: 'grid', gap: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>Visualização de performance das LPs</p>
        </div>
        <button type="button" onClick={handleLogout}>
          Sair
        </button>
      </header>

      <section style={{ border: '1px solid #e5e5e5', borderRadius: 12, padding: 16 }}>
        <form onSubmit={handleApplyFilters} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <label>
            Data inicial
            <input type="date" value={filters.startDate} onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))} />
          </label>
          <label>
            Data final
            <input type="date" value={filters.endDate} onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))} />
          </label>
          <label>
            Hora inicial
            <input type="time" value={filters.startTime} onChange={(e) => setFilters((prev) => ({ ...prev, startTime: e.target.value }))} />
          </label>
          <label>
            Hora final
            <input type="time" value={filters.endTime} onChange={(e) => setFilters((prev) => ({ ...prev, endTime: e.target.value }))} />
          </label>
          <label>
            LP
            <select value={filters.lp} onChange={(e) => setFilters((prev) => ({ ...prev, lp: e.target.value }))}>
              <option value="">Todas</option>
              {lpOptions.map((lp) => (
                <option key={lp} value={lp}>
                  {lp}
                </option>
              ))}
            </select>
          </label>
          <div style={{ alignSelf: 'end' }}>
            <button type="submit" disabled={loadingData}>
              {loadingData ? 'Carregando...' : 'Aplicar filtros'}
            </button>
          </div>
        </form>
      </section>

      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <MetricCard title="Acessos" value={formatNumber(data.overview?.accesses)} />
        <MetricCard title="Cliques WhatsApp" value={formatNumber(data.overview?.whatsappClicks)} />
        <MetricCard title="Taxa de conversão" value={formatPercent(data.overview?.conversionRate)} />
        <MetricCard title="Acessos do período anterior" value={formatNumber(data.comparison?.previousAccesses)} />
        <MetricCard title="Cliques do período anterior" value={formatNumber(data.comparison?.previousWhatsappClicks)} />
        <MetricCard title="Delta de acessos" value={formatPercent(data.comparison?.deltaAccesses)} />
        <MetricCard title="Delta de cliques" value={formatPercent(data.comparison?.deltaWhatsappClicks)} />
        <MetricCard title="Delta de taxa" value={formatPercent(data.comparison?.deltaConversionRate)} />
      </section>

      <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <DataTable title="Por hora do dia" columns={["Hora", "Acessos", "Cliques"]} rows={(data.byHour ?? []).map((row) => [row.hour, formatNumber(row.accesses), formatNumber(row.clicks)])} />
        <DataTable title="Por dia" columns={["Dia", "Acessos", "Cliques"]} rows={(data.byDay ?? []).map((row) => [row.day, formatNumber(row.accesses), formatNumber(row.clicks)])} />
        <DataTable
          title="Ranking de LPs"
          columns={["LP", "Acessos", "Cliques", "Taxa"]}
          rows={(data.ranking ?? []).map((row) => [row.lp, formatNumber(row.accesses), formatNumber(row.clicks), formatPercent(row.conversionRate)])}
        />
        <DataTable title="Cliques por estado" columns={["Estado", "Cliques"]} rows={(data.byState ?? []).map((row) => [row.state, formatNumber(row.clicks)])} />
        <DataTable title="Cliques por número" columns={["Número", "Cliques"]} rows={(data.byPhone ?? []).map((row) => [row.phone, formatNumber(row.clicks)])} />
      </section>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <article style={{ border: '1px solid #ececec', borderRadius: 12, padding: 14 }}>
      <strong style={{ display: 'block', opacity: 0.7, marginBottom: 8 }}>{title}</strong>
      <span style={{ fontSize: 22, fontWeight: 700 }}>{value}</span>
    </article>
  );
}

function DataTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <article style={{ border: '1px solid #ececec', borderRadius: 12, padding: 14, overflow: 'auto' }}>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>{title}</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} style={{ textAlign: 'left', borderBottom: '1px solid #ececec', padding: '8px 4px' }}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '10px 4px', opacity: 0.7 }}>
                Sem dados no período.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {row.map((value) => (
                  <td key={`${title}-${index}-${value}`} style={{ borderBottom: '1px solid #f5f5f5', padding: '8px 4px' }}>
                    {value}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </article>
  );
}
