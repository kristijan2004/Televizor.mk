
import { Route, Routes } from "react-router-dom";
import Home from "../src/components/Home";
import AddTv from "./components/addTv";
import Compare from "./components/Compare";
import TvDetails from "./components/TvDetails";
import { ContextProvider } from "./components/Context";
import RecommendTv from "./components/RecommendTv";
import { LanguageProvider } from "./LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <ContextProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="addTv" element={<AddTv />} />
          <Route path="compare" element={<Compare />} />
          <Route path="/tv/:brand/:model" element={<TvDetails />} />
          <Route path="recommend" element={<RecommendTv />} />
        </Routes>
      </ContextProvider>
    </LanguageProvider>
  );
}

export default App;
