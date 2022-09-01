
function sortToggle(array, propertyName, toggle) {
    if (propertyName != null) {
        let toggler = toggle ? 1 : -1
        if (array != null) {
            array = array.sort((x, y) =>
                x[propertyName] > y[propertyName] ? toggler : -toggler,
            )
        }
    }

    return array
}


function orderBy(array, property) {
    return sortToggle(array, property, true)
}

function orderByDescending(array, property) {
    return sortToggle(array, property, false)
}

module.exports = {
    orderBy,
    orderByDescending,
};