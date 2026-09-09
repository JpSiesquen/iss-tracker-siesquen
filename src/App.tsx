import './App.css';

function App() {
  // ERROR DELIBERADO: comprobando que el CI lo detecta
  const titulo: string = 42;
  console.log(titulo);

  return (
    <main className="app">
      <h1>ISS Tracker</h1>
      <p>Seguimiento en tiempo real de la Estación Espacial Internacional.</p>
    </main>
  );
}

export default App;
