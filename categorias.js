// ============================================
// FUNCIÓN PARA CAMBIAR DE CATEGORÍA
// Funciona con data-category en lugar de IDs separados
// ============================================

function switchCategory(category) {
    console.log('📂 Cambiando a categoría:', category);
    
    // 1. Actualizar tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 2. Mostrar/ocultar tarjetas según data-category
    const allCards = document.querySelectorAll('.service-card[data-category]');
    
    allCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        
        if (cardCategory === category) {
            card.style.display = 'flex'; // Mostrar
            card.style.animation = 'fadeIn 0.3s ease';
        } else {
            card.style.display = 'none'; // Ocultar
        }
    });
    
    console.log(`✅ Mostrando servicios de: ${category}`);
}

// ============================================
// CSS PARA ANIMACIÓN (agregar al head o CSS)
// ============================================
const style = document.createElement('style');
style.textContent = `
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;
document.head.appendChild(style);

// ============================================
// INICIALIZAR AL CARGAR LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando categorías...');
    
    // Mostrar solo academia por defecto
    const allCards = document.querySelectorAll('.service-card[data-category]');
    
    allCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (category === 'academia') {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
    
    console.log('✅ Categoría academia activa por defecto');
});

console.log('✅ Sistema de categorías cargado');