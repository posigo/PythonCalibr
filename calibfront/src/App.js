import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
//import logo from './logo.svg';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import Header from './components/header/Header';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import CalculationList from './components/CalculationList';
import CalculationDetail from './components/CalculationDetail';
import CalculationUpsert from './components/CalculationUpsert';
import SolutionsUpsert2 from './components/SolutionsUpsert2';
import AdminPanel from './components/AdminPanel/AdminPanel';
import AdminPanel2 from './pages/AdminPanel/AdminPanel2';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import NotificationsPage from './pages/NotificationsPage/NotificationsPage';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <ToastContainer />
        <Router>
          <Header />
          <main className='main-content'>
            <Routes>
              <Route path='/' element={<Home />} />
              <Route path='/calculations' element = {<CalculationList  />}  />
              <Route path="/calculations/:id" element={<CalculationDetail />} />
              <Route path="/calculations/new" element={<CalculationUpsert />}/>
              <Route path="/calculations/:id/edit" element={<CalculationUpsert />}/>
              <Route path="/calculations/:id/solutions/:countDensities" element={<SolutionsUpsert2 />}/>
              {/* <Route path='/adminpanel' element={<AdminPanel />}/> */}
              <Route path='/adminpanel2' element={<AdminPanel2 />}/>
              <Route path='/profile' element={<ProfilePage />}/>
              <Route path='/register' element={<RegisterPage  />}/>
              <Route path='/notifications' element={<NotificationsPage  />}/>
            </Routes>                  
          </main>
          <Footer  />
          {/* <div className='fixed-bottom align-self-stretch d-flex flex-row'><Footer  /></div> */}
          
        </Router>
      </div>
    </AuthProvider>    
  );
}

export default App;
