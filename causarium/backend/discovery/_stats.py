"""
Small statistical primitives for the discovery engines.

Implemented in pure numpy so the platform has no scipy/scikit-learn dependency.
Determinism is guaranteed by seeding a local numpy Generator (no global state).
"""

from typing import List, Tuple

import numpy as np


def kmeans(
    points: np.ndarray, k: int, seed: int = 0, iters: int = 50
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Lloyd's algorithm with k-means++ seeding.

    Returns (labels, centroids). ``k`` is clamped to the number of points.
    """
    n = points.shape[0]
    k = max(1, min(k, n))
    rng = np.random.default_rng(seed)

    # k-means++ initialization.
    centroids = np.empty((k, points.shape[1]), dtype=float)
    centroids[0] = points[rng.integers(n)]
    for i in range(1, k):
        d2 = np.min(
            ((points[:, None, :] - centroids[None, :i, :]) ** 2).sum(axis=2), axis=1
        )
        total = d2.sum()
        probs = d2 / total if total > 0 else np.full(n, 1.0 / n)
        centroids[i] = points[rng.choice(n, p=probs)]

    labels = np.zeros(n, dtype=int)
    for _ in range(iters):
        dists = ((points[:, None, :] - centroids[None, :, :]) ** 2).sum(axis=2)
        new_labels = dists.argmin(axis=1)
        if np.array_equal(new_labels, labels) and _ > 0:
            break
        labels = new_labels
        for c in range(k):
            members = points[labels == c]
            if len(members) > 0:
                centroids[c] = members.mean(axis=0)
    return labels, centroids


def best_k(points: np.ndarray, k_max: int = 5, seed: int = 0) -> Tuple[int, np.ndarray, np.ndarray]:
    """
    Choose k by the elbow of within-cluster inertia (relative improvement).
    Returns (k, labels, centroids).
    """
    n = points.shape[0]
    if n <= 2:
        labels, centroids = kmeans(points, 1, seed)
        return 1, labels, centroids

    k_max = min(k_max, n)
    best = (1, *kmeans(points, 1, seed))
    prev_inertia = _inertia(points, best[1], best[2])
    chosen_k = 1
    chosen = best
    for k in range(2, k_max + 1):
        labels, centroids = kmeans(points, k, seed)
        inertia = _inertia(points, labels, centroids)
        improvement = (prev_inertia - inertia) / prev_inertia if prev_inertia > 0 else 0.0
        prev_inertia = inertia
        # Accept another cluster only if it explains meaningfully more variance.
        if improvement > 0.15:
            chosen_k, chosen = k, (k, labels, centroids)
        else:
            break
    return chosen[0], chosen[1], chosen[2]


def _inertia(points: np.ndarray, labels: np.ndarray, centroids: np.ndarray) -> float:
    return float(sum(((points[labels == c] - centroids[c]) ** 2).sum() for c in range(len(centroids))))


def bimodality_coefficient(values: List[float]) -> float:
    """
    Sarle's bimodality coefficient in [0, 1]. Values above ~0.555 indicate a
    bimodal (or more strongly, bifurcated) distribution.
    """
    x = np.asarray(values, dtype=float)
    n = x.size
    if n < 4:
        return 0.0
    std = x.std()
    if std == 0:
        return 0.0
    z = (x - x.mean()) / std
    skew = np.mean(z ** 3)
    kurt = np.mean(z ** 4) - 3.0  # excess kurtosis
    denom = kurt + 3.0 * ((n - 1) ** 2) / ((n - 2) * (n - 3))
    if denom == 0:
        return 0.0
    return float((skew ** 2 + 1.0) / denom)
