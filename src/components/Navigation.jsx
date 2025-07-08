import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IoAdd, IoClose } from 'react-icons/io5';
import { GiFilmSpool } from "react-icons/gi";

const Navigation = ({ isAdmin, onAddClick, showBackButton = false, onBackClick, title }) => {
     const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
     const location = useLocation();

     const navItems = [
          { path: '/', label: 'Home' },
          { path: '/movies', label: 'Movies' },
          { path: '/series', label: 'Series' }
     ];

     return (
          <nav className="navbar">
               <div className="nav-left">
                    {showBackButton && (
                         <button className="back-btn" onClick={onBackClick}>
                              <IoArrowBack />
                         </button>
                    )}

                    <div className="logo">
                         <GiFilmSpool size={32} />
                         <span>Oli</span>
                    </div>

                    {title && (
                         <div className="page-title">
                              <h1>{title}</h1>
                         </div>
                    )}

                    <ul className="nav-links desktop-menu">
                         {navItems.map(item => (
                              <li key={item.path}>
                                   <Link
                                        to={item.path}
                                        className={location.pathname === item.path ? 'active' : ''}
                                   >
                                        {item.label}
                                   </Link>
                              </li>
                         ))}
                    </ul>
               </div>

               {mobileMenuOpen && (
                    <div className="mobile-menu">
                         {navItems.map(item => (
                              <Link
                                   key={item.path}
                                   to={item.path}
                                   onClick={() => setMobileMenuOpen(false)}
                                   className={location.pathname === item.path ? 'active' : ''}
                              >
                                   {item.label}
                              </Link>
                         ))}
                    </div>
               )}

               <div className="nav-right">
                    {isAdmin && onAddClick && (
                         <button className="add-btn" onClick={onAddClick}>
                              <IoAdd />
                              Add {title}
                         </button>
                    )}

                    <button
                         className="mobile-menu-toggle mobile-only"
                         onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                         {mobileMenuOpen ? <IoClose /> : <IoAdd />}
                    </button>
               </div>
          </nav>
     );
};

export default Navigation;