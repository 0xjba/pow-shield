// Client-side example (React)
import { PowClient } from 'pow-shield';

// Initialize PoW Shield client
const powClient = new PowClient({
  endpoints: ['/api/data', '/api/submit'],
  difficulty: 4
});

// Example component using PoW Shield
function DataFetcher() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Use powClient.fetch instead of regular fetch
        const response = await powClient.fetch('/api/data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Data from protected API:</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default DataFetcher;