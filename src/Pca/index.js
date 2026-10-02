import { NMath } from "../NMath/index.js";

const { vec, mat } = NMath;

//========================================================================================
/*                                                                                      *
 *                                          PCA                                         *
 *                                                                                      */
//========================================================================================

const PCA = {}
// data: array<array[size: D]<number>>, numComponents: number of principal components to keep
PCA.new = function (data, numComponents, options = {}) {
    //const { } = options;
    // Center the data
    const n = data.length;
    const d = data[0].length;
    let mean = vec.zero(d);
    let originalData = [...data];
    for (let i = 0; i < n; i++) {
        originalData[i] = vec(...data[i]);
        mean = mean.add(originalData[i]);
    }
    mean = mean.scale(1 / n);
    let centeredData = []
    for (let i = 0; i < n; i++) {
        centeredData.push(originalData[i].sub(mean));
    }

    let covarianceMatrix = mat.zero(d, d);
    for (let i = 0; i < n; i++) {
        covarianceMatrix = covarianceMatrix.add(centeredData[i].outer(centeredData[i]));
    }
    covarianceMatrix = covarianceMatrix.scale(1 / (n - 1)); // to get variance
    const { eigenvalues, eigenvectors } = covarianceMatrix.eigen({ k: numComponents });
    return {
        mean,
        principalValues: eigenvalues,
        components: eigenvectors,
        gen: (coordinates) => {
            let n = Math.min(coordinates.length, eigenvectors.length);
            let sample = mean;
            for (let i = 0; i < n; i++) {
                sample = sample.add(eigenvectors[i].scale(coordinates[i] * Math.sqrt(Math.max(0, eigenvalues[i]))));
            }
            return sample;
        },
        proj: (sample) => {
            let sampleVec = vec(...sample);
            let n = numComponents;
            let coordinates = new Array(n);
            for (let i = 0; i < n; i++) {
                coordinates[i] = sampleVec.sub(mean).dot(eigenvectors[i]) / Math.sqrt(Math.max(0, eigenvalues[i]));
            }
            return coordinates;
        }
    };
}

export { PCA };