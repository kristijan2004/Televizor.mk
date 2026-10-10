import { Route, Routes } from "react-router-dom";
import Home from "../src/components/Home";
import AddTv from "./components/addTv";
import Compare from "./components/Compare";
import TvDetails from "./components/TvDetails";
import { ContextProvider } from "./components/Context";
import Novosti from "./components/Novosti";
import NewsArticle from "./components/NewsArticle";
import Edu from "./components/Edu";
import OdberiTv from "./components/OdberiTv";

function App() {
  return (
    <ContextProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="addTv" element={<AddTv />} />
        <Route path="compare" element={<Compare />} />
        <Route path="/tv/:brand/:model" element={<TvDetails />} />
        <Route path="novosti" element={<Novosti />} />
        <Route path="novosti/:slug" element={<NewsArticle />} />
        <Route path="edu" element={<Edu />} />
        <Route path="odberi-tv" element={<OdberiTv />} />
      </Routes>
    </ContextProvider>
  );
}

export default App;
