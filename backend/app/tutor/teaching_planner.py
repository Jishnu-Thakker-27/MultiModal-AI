import logging
from typing import List, Dict, Any

def get_topic_opening_hook(target_name: str, domain: str = "mathematics") -> str:
    """Returns a captivating, pedagogically inspiring opening hook tailored specifically to the topic."""
    name_low = target_name.lower().strip()
    if name_low in ["general", "course material", "study session", "the requested concept"]:
        target_name = "this foundational topic"
        name_low = target_name.lower().strip()

    if any(k in name_low for k in ["curve fit", "curve-fit", "least square", "least-square", "regression"]):
        return (
            f"From calibrating laboratory sensors and fitting empirical measurements to physical laws, to predicting market trajectories, "
            f"**{target_name}** gives us the mathematical power to discover the true underlying signal hidden inside noisy experimental data."
        )
    elif any(k in name_low for k in ["ode", "numerical solution of ode", "ordinary differential equation", "euler", "runge-kutta", "rk4", "differential equation"]):
        return (
            f"From simulating planetary orbits and flight dynamics to modeling electrical circuits and physical systems, "
            f"**{target_name}** provides the numerical horsepower to solve complex real-world dynamics when exact pencil-and-paper math cannot reach."
        )
    elif any(k in name_low for k in ["probability", "distribution", "random variable"]):
        return (
            f"From forecasting tomorrow's weather to predicting market swings and training intelligent AI models, "
            f"our entire ability to make smart decisions in an uncertain world rests on the power of **{target_name}**."
        )
    elif any(k in name_low for k in ["numerical integration", "simpson", "trapezoidal", "quadrature"]):
        return (
            f"When curves in engineering and physics become too wild for textbook calculus, "
            f"**{target_name}** steps in to turn seemingly impossible areas into precise, solvable calculations."
        )
    elif any(k in name_low for k in ["interpolation", "finite difference", "newton", "difference operator"]):
        return (
            f"Imagine predicting a spacecraft's trajectory or reconstructing missing scientific readings from just a few points—"
            f"that is the exact predictive superpower that **{target_name}** unlocks."
        )
    elif any(k in name_low for k in ["linear algebra", "matrix", "eigen", "vector space"]):
        return (
            f"Behind search engine ranking algorithms, 3D video game graphics, and quantum simulations "
            f"lies the elegant geometric language of **{target_name}**."
        )
    elif any(k in name_low for k in ["derivative", "calculus", "differential"]):
        return (
            f"Whenever you want to understand how things change in real time—from a rocket's acceleration to the spread of ideas—"
            f"**{target_name}** gives you the mathematical lens to capture motion in an instant."
        )
    elif any(k in name_low for k in ["fourier", "laplace", "frequency", "signal"]):
        return (
            f"From filtering digital audio and wireless communication to medical imaging, "
            f"**{target_name}** provides the indispensable mathematical lens that decomposes complex, noisy signals into pure vibrational harmonics."
        )
    elif any(k in name_low for k in ["database", "sql", "normalization", "relational", "schema", "dbms"]):
        return (
            f"Behind every enterprise web application, financial transaction, and secure cloud system "
            f"lies the structural discipline of **{target_name}**, ensuring mission-critical data remains consistent, redundant-free, and blazing fast to query."
        )
    elif any(k in name_low for k in ["operating system", "process", "thread", "scheduling", "deadlock"]):
        return (
            f"Every time you run an app or stream high-definition video, "
            f"**{target_name}** quietly orchestrates hardware resources and CPU scheduling to ensure seamless multitasking without chaos."
        )
    elif any(k in name_low for k in ["machine learning", "neural network", "deep learning", "gradient descent", "ai"]):
        return (
            f"From self-driving perception and medical image diagnosis to intelligent language models, "
            f"**{target_name}** is the foundational algorithmic engine that allows machines to learn and generalize from experience."
        )
    elif any(k in name_low for k in ["tree", "graph", "data structure", "algorithm", "bst", "avl", "sorting"]):
        return (
            f"Whether routing global internet packets in milliseconds or mapping complex relationships across billions of users, "
            f"**{target_name}** forms the foundational architecture of computational thinking."
        )
    elif any(k in name_low for k in ["thermodynamics", "entropy", "heat", "energy"]):
        return (
            f"From designing powerful propulsion engines to understanding the universal arrow of time, "
            f"**{target_name}** governs how energy flows, transforms, and powers our universe."
        )
    else:
        return (
            f"Whether formulating scientific models, solving practical problems, or designing modern technology, "
            f"mastering **{target_name}** gives you an essential conceptual framework to break down complex challenges into clear, solvable insights."
        )

def get_topic_groundup_explanation(target_name: str, domain: str = "mathematics") -> Dict[str, Any]:
    """
    Returns a rich, domain-accurate, ground-up conceptual explanation and practice challenge
    tailored specifically to the topic. Eliminates generic templates and ensures thorough teaching before solving.
    """
    name_low = target_name.lower().strip()

    if any(k in name_low for k in ["root", "algebraic and transcendental", "algebraic", "transcendental", "bisection", "newton-raphson", "regula-falsi", "secant"]):
        return {
            "heading": "### 🎯 Core Conceptual Foundation: Roots of Equations",
            "explanation": (
                "When solving mathematical models in science and engineering, we frequently arrive at equations written in the standard form:\n\n"
                "$$\\quad f(x) = 0$$\n\n"
                "A **root** (also known as a *zero*) of this equation is any numerical value $x = \\alpha$ that satisfies this relation, meaning $f(\\alpha) = 0$. "
                "Geometrically, if you plot the curve $y = f(x)$ on a coordinate plane, the roots correspond precisely to the **points where the curve intersects or touches the horizontal x-axis**.\n\n"
                "In mathematics, equations naturally divide into two major families:\n"
                "1. **Algebraic Equations**: Formed purely from finite polynomial terms ($a_n x^n + a_{n-1} x^{n-1} + \\dots + a_0 = 0$), such as $x^3 - 4x + 1 = 0$.\n"
                "2. **Transcendental Equations**: Contain non-algebraic mathematical functions—such as trigonometric terms ($\\sin x, \\cos x$), exponentials ($e^x$), or logarithms ($\\ln x$), like $x e^x - 1 = 0$ or $\\cos x - x = 0$.\n\n"
                "**Why do we need Numerical Methods?**\n"
                "While linear and quadratic equations can be solved with exact paper-and-pencil formulas (like the quadratic formula), the famous Abel-Ruffini theorem proves that there is no general algebraic formula for polynomials of degree $5$ or higher. "
                "Furthermore, transcendental equations almost never possess closed-form algebraic solutions. "
                "To overcome this, engineers and computational scientists use **iterative numerical methods** (such as the Bisection Method, Regula-Falsi, and Newton-Raphson) to systematically zoom in on roots to any desired decimal precision.\n\n"
                "**The Guiding Theorem (Intermediate Value Theorem)**:\n"
                "Every root-finding process begins with bracket identification: if a continuous curve $f(x)$ changes sign across an interval $[a, b]$—meaning $f(a)$ and $f(b)$ have opposite signs ($f(a) \\cdot f(b) < 0$)—then the curve must cross the x-axis at least once, guaranteeing that a real root exists between $a$ and $b$."
            ),
            "challenge": (
                "**Now, let's put this into practice together!**\n\n"
                "Consider the polynomial equation:\n"
                "$$\\quad f(x) = x^3 - x - 1 = 0$$\n\n"
                "Let's test the boundary values at $x = 1$ and $x = 2$:\n"
                "- $f(1) = (1)^3 - 1 - 1 = -1$ (negative)\n"
                "- $f(2) = (2)^3 - 2 - 1 = 5$ (positive)\n\n"
                "Because the sign changes from negative to positive, a root is guaranteed to lie inside $[1, 2]$. "
                "Now evaluate the midpoint $x = 1.5$:\n"
                "$$f(1.5) = (1.5)^3 - 1.5 - 1 = 3.375 - 1.5 - 1 = 0.875$$\n\n"
                "Notice that $f(1.5)$ is **positive** ($+0.875$). Based on the sign change rule ($f(a) \\cdot f(b) < 0$), in which subinterval must the root now lie: **$[1, 1.5]$** or **$[1.5, 2]$**?"
            ),
            "options": [
                "The root lies in [1, 1.5]",
                "The root lies in [1.5, 2]",
                "Let's walk through the interval bracket step-by-step"
            ]
        }
    elif any(k in name_low for k in ["probability", "distribution", "random variable"]):
        return {
            "heading": f"### 🎯 Core Conceptual Foundation: {target_name}",
            "explanation": (
                f"In probability theory, when we perform an experiment, we rarely care about raw abstract descriptions—we care about measurable numerical quantities. "
                f"A **random variable** $X$ translates real-world outcomes into numbers (for example, the number of successful transactions in an hour, the lifespan of a battery, or temperature variations).\n\n"
                f"A **{target_name}** is the complete mathematical rule that assigns a probability to every possible value the random variable can take. "
                f"Rather than looking at a single chance event in isolation, it provides the total blueprint of uncertainty.\n\n"
                f"Every probability distribution is strictly bound by two fundamental mathematical axioms:\n"
                f"1. **Non-negativity & Bounded Scale**: Every individual likelihood must be non-negative: $0 \\le P(X = x) \\le 1$.\n"
                f"2. **Total Certainty**: Across all possible mutually exclusive outcomes, the total probability must equal exactly $1$:\n"
                f"$$\\quad \\sum P(X = x) = 1 \\quad \\text{{(for discrete)}}, \\qquad \\int_{{-\\infty}}^{{\\infty}} f(x)dx = 1 \\quad \\text{{(for continuous)}}$$\n\n"
                f"Distributions divide into **Discrete** (countable values like coin tosses or defect counts, modeled by a PMF) and **Continuous** (measurable values like time or height, modeled by a PDF where probability is measured as area under the curve)."
            ),
            "challenge": (
                f"**Now, let's test your understanding with a practical problem!**\n\n"
                f"Suppose a sensor quality diagnostic classifies incoming signals into three categories with values $X = 1, 2,$ and $3$.\n"
                f"Laboratory tests establish that:\n"
                f"- $P(X = 1) = 0.20$\n"
                f"- $P(X = 2) = 0.45$\n\n"
                f"Using the fundamental axiom of total certainty ($\\sum P(X) = 1$), what must the probability $P(X = 3)$ equal?"
            ),
            "options": [
                "P(X = 3) = 0.35",
                "Show me how to solve this step-by-step",
                "Explain the difference between discrete and continuous distributions"
            ]
        }
    elif any(k in name_low for k in ["curve fit", "curve-fit", "least square", "regression"]):
        return {
            "heading": f"### 🎯 Core Conceptual Foundation: {target_name}",
            "explanation": (
                f"In laboratory experiments, engineering tests, and data science, physical measurements are always subject to environmental noise, sensor tolerance, and human error. "
                f"If you record $n$ data points $(x_1, y_1), (x_2, y_2), \\dots, (x_n, y_n)$, plotting them on a graph will virtually never produce a pristine mathematical line.\n\n"
                f"**The Purpose of Curve Fitting**:\n"
                f"The objective is **not** to force a jagged curve to pass through every single point (which simply memorizes and overfits the noise). "
                f"Instead, the goal is to discover the underlying mathematical trend $y = f(x)$ that best represents the physical reality governing the system.\n\n"
                f"**The Principle of Least Squares**:\n"
                f"For any candidate curve $y = f(x)$, each data point $(x_i, y_i)$ has a vertical deviation called a **residual error**:\n"
                f"$$\\quad e_i = y_i - f(x_i)$$\n\n"
                f"If we simply summed the raw errors, positive deviations above the line would cancel out negative deviations below the line, giving an illusion of zero total error even for a completely wrong curve. "
                f"To resolve this, the **Method of Least Squares** squares every individual deviation and minimizes the sum of squared errors:\n"
                f"$$\\quad S = \\sum_{{i=1}}^n e_i^2 = \\sum_{{i=1}}^n \\big(y_i - f(x_i)\\big)^2$$\n\n"
                f"By taking partial derivatives of $S$ with respect to the unknown curve parameters and setting them to zero, we obtain a system of linear equations called the **Normal Equations**."
            ),
            "challenge": (
                f"**Now, let's test your understanding with a key concept question!**\n\n"
                f"Why does the Principle of Least Squares minimize the sum of *squared* residuals $\\sum e_i^2$ rather than the sum of raw residuals $\\sum e_i$?\n"
                f"What would happen to the estimated curve if positive and negative errors were allowed to cancel each other out?"
            ),
            "options": [
                "Positive and negative errors would cancel out to zero without squaring",
                "Let's solve a simple linear fit together",
                "Show me the normal equations for y = a + bx"
            ]
        }
    elif any(k in name_low for k in ["numerical integration", "simpson", "trapezoidal", "quadrature"]):
        return {
            "heading": f"### 🎯 Core Conceptual Foundation: {target_name}",
            "explanation": (
                f"In calculus, the definite integral $\\int_a^b f(x)dx$ represents the exact accumulated area under a continuous curve between $x = a$ and $x = b$.\n\n"
                f"However, in real-world engineering, you frequently encounter two roadblocks:\n"
                f"1. **No Closed-Form Antiderivative**: Functions like $f(x) = e^{{-x^2}}$ (the Gaussian bell curve) or $\\frac{{\\sin x}}{{x}}$ cannot be integrated using elementary analytical calculus.\n"
                f"2. **Empirical Tabulated Data**: In many engineering applications, the formula $f(x)$ is completely unknown; you only possess discrete data sampled from physical instruments at fixed intervals.\n\n"
                f"**The Numerical Strategy: Geometric Approximation**:\n"
                f"Numerical integration resolves this by dividing the total interval $[a, b]$ into $n$ smaller subintervals of uniform width $h = \\frac{{b-a}}{{n}}$ and approximating each slice with a simple geometric shape:\n"
                f"- **Trapezoidal Rule**: Connects consecutive points with straight line segments (linear interpolation), replacing curved slices with geometric trapezoids.\n"
                f"- **Simpson's Rules**: Connects groups of points using parabolas (quadratic interpolation for Simpson's 1/3 Rule) or cubics (Simpson's 3/8 Rule), delivering far higher accuracy for smooth curves."
            ),
            "challenge": (
                f"**Now, let's test your intuition with a concept challenge!**\n\n"
                f"Suppose you are integrating a function that is strictly concave upward (curving upward like $y = x^2$ or $y = e^x$).\n"
                f"If you use the **Trapezoidal Rule** by connecting data points with straight chord segments, will the numerical result be an **overestimate** or an **underestimate** of the true area? Why?"
            ),
            "options": [
                "It will overestimate because the chords lie strictly above the curve",
                "It will underestimate",
                "Let's solve a numerical integration example step-by-step"
            ]
        }
    elif any(k in name_low for k in ["database", "sql", "normalization", "relational", "schema", "dbms"]):
        return {
            "heading": f"### 🎯 Core Conceptual Foundation: {target_name}",
            "explanation": (
                f"In database systems and enterprise software architecture, databases must reliably handle millions of concurrent operations without data corruption or inconsistency.\n\n"
                f"When database schemas are designed poorly without proper structure, they suffer from **Data Redundancy** (storing the same piece of information repeatedly across multiple rows). "
                f"This redundancy leads to severe operational hazards known as anomalies:\n"
                f"1. **Insertion Anomaly**: Inability to record certain information without also inserting unrelated data.\n"
                f"2. **Deletion Anomaly**: Unintentionally losing vital related data when deleting a record.\n"
                f"3. **Update Anomaly**: Having to modify data in dozens of places, where missing even one leads to contradictory data.\n\n"
                f"**The Discipline of Normalization**:\n"
                f"Normalization is the formal process of systematically organizing database tables using Functional Dependencies to minimize redundancy and eliminate update anomalies while preserving data lossless join integrity."
            ),
            "challenge": (
                f"**Let's test this concept with a real-world scenario!**\n\n"
                f"Imagine a single university table storing `StudentID`, `StudentName`, `CourseID`, and `ProfessorOffice`.\n"
                f"If the last student enrolled in Course CS101 drops the course, deleting that student's record also erases the information about where the professor's office is located.\n"
                f"What type of database anomaly is this an example of?"
            ),
            "options": [
                "Deletion anomaly",
                "Let's explore 1NF, 2NF, and 3NF step-by-step",
                "Show an un-normalized schema vs normalized schema"
            ]
        }
    else:
        return {
            "heading": f"### 🎯 Core Conceptual Foundation: {target_name}",
            "explanation": (
                f"Mastering **{target_name}** begins with understanding the central challenge it was created to solve.\n\n"
                f"In {domain}, complex systems and real-world processes rarely present themselves in simple, isolated forms. "
                f"**{target_name}** provides a rigorous, structured methodology to break down complex phenomena into clear, predictable principles.\n\n"
                f"**Core Principles & Mechanics**:\n"
                f"1. **Fundamental Definition**: It establishes the formal boundaries, variables, and rules that govern how {target_name} operates.\n"
                f"2. **Operational Framework**: It defines the step-by-step mechanisms, constraints, and relationships that allow you to analyze, calculate, and predict outcomes.\n"
                f"3. **Real-World Impact**: Whether optimizing performance, managing uncertainty, or modeling physical dynamics, it turns abstract theory into practical, solvable solutions."
            ),
            "challenge": (
                f"**Now, let's test your understanding with an interactive challenge!**\n\n"
                f"To solidify your foundational grasp of **{target_name}**, let's examine how its core rules apply in practice.\n"
                f"Would you like to solve a targeted numerical or conceptual problem, or walk through a concrete case study together?"
            ),
            "options": [
                "Let's solve a targeted practice problem together",
                "Walk through a concrete real-world case study",
                "Explain the theoretical equations in more detail"
            ]
        }

def get_topic_operational_mechanics(target_name: str, domain: str = "mathematics") -> Dict[str, Any]:
    """
    Returns rich, domain-accurate operational mechanics, formulas, and follow-up challenges
    tailored specifically to the topic for Socratic Turn 2 (eliminates generic hints).
    """
    name_low = target_name.lower().strip()

    if any(k in name_low for k in ["root", "algebraic and transcendental", "algebraic", "transcendental", "bisection", "newton-raphson", "regula-falsi", "secant"]):
        return {
            "heading": "### ⚙️ Operational Mechanics: The Three Major Numerical Methods",
            "explanation": (
                "Excellent mathematical deduction! Since $f(1) = -1$ (negative) and $f(1.5) = +0.875$ (positive), "
                "the sign change occurs across the bracket $[1, 1.5]$. Therefore, the true root lies strictly in $[1, 1.5]$.\n\n"
                "Once an initial bracket $[a, b]$ is secured, computational solvers employ one of three foundational algorithms to isolate the root:\n\n"
                "1. **The Bisection Method (Interval Halving)**:\n"
                "- **Formula**: $x_m = \\frac{a + b}{2}$\n"
                "- **Mechanics**: Computes the exact midpoint, evaluates $f(x_m)$, and replaces the boundary sharing the same sign. Each iteration shrinks the uncertainty by exactly $50\\%$.\n"
                "- **Trade-off**: Guaranteed convergence for any continuous function, but relatively slow (linear convergence rate).\n\n"
                "2. **Regula-Falsi Method (False Position)**:\n"
                "- **Formula**: $x_r = \\frac{a f(b) - b f(a)}{f(b) - f(a)}$\n"
                "- **Mechanics**: Instead of blindly taking the midpoint, it connects $(a, f(a))$ and $(b, f(b))$ with a straight line (secant chord) and finds where that line hits the x-axis. Points closer to zero exert stronger pull.\n\n"
                "3. **Newton-Raphson Method (Tangent Slope)**:\n"
                "- **Formula**: $x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}$\n"
                "- **Mechanics**: Drops a tangent line from $(x_n, f(x_n))$ using the derivative $f'(x_n)$. Because it utilizes curvature information, it boasts **quadratic convergence**—roughly doubling the number of correct decimal places with every single step!"
            ),
            "challenge": (
                "**Let's test the Newton-Raphson formula with a quick calculation!**\n\n"
                "Suppose we want to approximate $\\sqrt{2} \\approx 1.4142$ by solving:\n"
                "$$\\quad f(x) = x^2 - 2 = 0$$\n\n"
                "Taking the derivative gives $f'(x) = 2x$. Substituting into Newton-Raphson:\n"
                "$$x_{n+1} = x_n - \\frac{x_n^2 - 2}{2x_n} = \\frac{x_n + \\frac{2}{x_n}}{2}$$\n\n"
                "If we choose a starting guess of $x_0 = 1.0$, what is the first calculated approximation $x_1$?"
            ),
            "options": [
                "x_1 = 1.5",
                "x_1 = 1.414",
                "Let's walk through the Newton-Raphson calculation step-by-step"
            ]
        }
    elif any(k in name_low for k in ["probability", "distribution", "random variable"]):
        return {
            "heading": f"### ⚙️ Operational Mechanics: Expectations, Moments & Modeling",
            "explanation": (
                "Spot-on reasoning! By the axiom of total certainty ($\\sum P(X) = 1$):\n\n"
                "$$P(X = 3) = 1 - P(X = 1) - P(X = 2) = 1 - 0.20 - 0.45 = 0.35$$\n\n"
                "Once the full probability distribution is established, we can calculate the governing **summary metrics** that characterize the behavior of the system:\n\n"
                "1. **Expected Value (Mean / Center of Mass)**:\n"
                "$$\\quad E[X] = \\mu = \\sum x \\cdot P(X = x)$$\n"
                "Represents the theoretical long-term average outcome if the experiment were repeated thousands of times.\n\n"
                "2. **Variance (Spread & Volatility)**:\n"
                "$$\\quad \\text{Var}(X) = \\sigma^2 = \\sum (x - \\mu)^2 \\cdot P(X = x) = E[X^2] - (E[X])^2$$\n"
                "Measures how tightly or widely outcomes cluster around the expected center."
            ),
            "challenge": (
                "**Let's calculate the expected value $E[X]$ together!**\n\n"
                "Using our sensor diagnostic data:\n"
                "- $X = 1$ with $P = 0.20$\n"
                "- $X = 2$ with $P = 0.45$\n"
                "- $X = 3$ with $P = 0.35$\n\n"
                "$$E[X] = (1 \\times 0.20) + (2 \\times 0.45) + (3 \\times 0.35) = ?$$\n\n"
                "What is the expected average value $E[X]$?"
            ),
            "options": [
                "E[X] = 2.15",
                "Show me the step-by-step calculation",
                "Explain the variance calculation next"
            ]
        }
    elif any(k in name_low for k in ["curve fit", "curve-fit", "least square", "regression"]):
        return {
            "heading": "### ⚙️ Operational Mechanics: The Normal Equations for Linear & Polynomial Fit",
            "explanation": (
                "Great conceptual foundation! To fit a straight line $y = a + bx$ to $n$ data points, "
                "we minimize the sum of squared residuals $S = \\sum_{i=1}^n (y_i - a - bx_i)^2$.\n\n"
                "Taking the partial derivatives with respect to $a$ and $b$ and setting them to zero yields the **Normal Equations**:\n\n"
                "1. $\\frac{\\partial S}{\\partial a} = 0 \\implies n a + b \\sum x = \\sum y$\n"
                "2. $\\frac{\\partial S}{\\partial b} = 0 \\implies a \\sum x + b \\sum x^2 = \\sum xy$\n\n"
                "This forms a direct $2 \\times 2$ linear system that can be solved analytically using determinants or elimination without iterative guesswork!"
            ),
            "challenge": (
                "**Let's test the Normal Equations with a mini dataset!**\n\n"
                "Suppose we have 3 data points: $(1, 2), (2, 3), (3, 5)$.\n"
                "- $n = 3$\n"
                "- $\\sum x = 1 + 2 + 3 = 6$\n"
                "- $\\sum y = 2 + 3 + 5 = 10$\n"
                "- $\\sum x^2 = 1 + 4 + 9 = 14$\n"
                "- $\\sum xy = (1 \\times 2) + (2 \\times 3) + (3 \\times 5) = 23$\n\n"
                "Setting up the equations:\n"
                "$$3a + 6b = 10$$\n"
                "$$6a + 14b = 23$$\n\n"
                "Multiplying the first equation by 2 gives $6a + 12b = 20$. Subtracting gives $2b = 3 \\implies b = 1.5$.\n"
                "What is the value of the intercept $a$?"
            ),
            "options": [
                "a = 0.333 (1/3)",
                "a = 1.0",
                "Show the full step-by-step substitution"
            ]
        }
    elif any(k in name_low for k in ["numerical integration", "simpson", "trapezoidal", "quadrature"]):
        return {
            "heading": "### ⚙️ Operational Mechanics: Trapezoidal vs. Simpson's 1/3 Rule",
            "explanation": (
                "Excellent insight! Chords above a concave curve will indeed overestimate the area.\n\n"
                "To evaluate $\\int_a^b f(x) dx$ with uniform spacing $h = \\frac{b-a}{n}$ across ordinates $y_0, y_1, \\dots, y_n$:\n\n"
                "1. **Composite Trapezoidal Rule**:\n"
                "$$\\quad I_T = \\frac{h}{2} \\Big[ y_0 + y_n + 2(y_1 + y_2 + \\dots + y_{n-1}) \\Big]$$\n"
                "- Uses linear pieces. Truncation error: $\\mathcal{O}(h^2)$.\n\n"
                "2. **Composite Simpson's 1/3 Rule**:\n"
                "$$\\quad I_S = \\frac{h}{3} \\Big[ y_0 + y_n + 4(y_1 + y_3 + \\dots) + 2(y_2 + y_4 + \\dots) \\Big]$$\n"
                "- Fits parabolic arcs through trios of points. Truncation error: $\\mathcal{O}(h^4)$. Requires an even number of intervals ($n$ must be even)."
            ),
            "challenge": (
                "**Let's test the Simpson's 1/3 formula structure!**\n\n"
                "Why must the total number of subintervals $n$ be an **even integer** for Simpson's 1/3 Rule to be applicable?\n"
                "What geometric property requires this condition?"
            ),
            "options": [
                "Each parabolic arc spans across two adjacent intervals (3 data points)",
                "Because odd intervals produce negative errors",
                "Let's solve an integration example step-by-step"
            ]
        }
    elif any(k in name_low for k in ["database", "sql", "normalization", "relational", "schema", "dbms"]):
        return {
            "heading": "### ⚙️ Operational Mechanics: Functional Dependencies & Normal Forms (1NF → 3NF)",
            "explanation": (
                "Spot-on! Deleting Course CS101 unintentionally destroyed the professor's office info, which is a classic Deletion Anomaly.\n\n"
                "The mathematical tool to fix this is the **Functional Dependency** $X \\to Y$ (attribute set $X$ uniquely determines $Y$).\n\n"
                "1. **First Normal Form (1NF)**:\n"
                "- Every column contains only atomic (indivisible) values. No arrays, repeating groups, or composite lists.\n\n"
                "2. **Second Normal Form (2NF)**:\n"
                "- Must be in 1NF.\n"
                "- No **partial dependency**: No non-prime attribute may depend on only a subset of any candidate composite key.\n\n"
                "3. **Third Normal Form (3NF)**:\n"
                "- Must be in 2NF.\n"
                "- No **transitive dependency**: For every non-trivial functional dependency $X \\to Y$, either $X$ is a superkey, or $Y$ is a prime attribute."
            ),
            "challenge": (
                "**Let's analyze a schema dependency!**\n\n"
                "Suppose we have relation $R(A, B, C)$ where $A$ is the Primary Key.\n"
                "The functional dependencies are:\n"
                "- $A \\to B$\n"
                "- $B \\to C$\n\n"
                "Since $A \\to B$ and $B \\to C$ transitively implies $A \\to C$, and $B$ is not a superkey, which normal form does this relation violate?"
            ),
            "options": [
                "Violates 3NF due to transitive dependency B -> C",
                "Violates 2NF",
                "Decompose R into 3NF step-by-step"
            ]
        }
    else:
        return {
            "heading": f"### ⚙️ Operational Mechanics & Algorithmic Framework: {target_name}",
            "explanation": (
                f"Great progress on the foundational concepts of **{target_name}**!\n\n"
                f"Now let's examine the exact **operational mechanics and algorithmic steps** that govern how problems are formulated and solved in practice:\n\n"
                f"1. **Governing Equations & Constraints**: The formal relationships and boundary conditions that dictate valid states.\n"
                f"2. **Computational Workflow**: The systematic sequence of operations used to compute solutions, verify accuracy, and minimize error.\n"
                f"3. **Convergence & Stability**: How the method behaves as problem complexity or data size scales up."
            ),
            "challenge": (
                f"**Ready for the next step?**\n\n"
                f"Would you like to walk through a concrete computational calculation, analyze edge cases, or proceed to comprehensive exam-level synthesis?"
            ),
            "options": [
                "Walk through a computational calculation step-by-step",
                "Analyze edge cases and stability conditions",
                "Proceed to full synthesis and mastery"
            ]
        }

def get_topic_synthesis_mastery(target_name: str, domain: str = "mathematics") -> Dict[str, Any]:
    """
    Returns rich, domain-accurate synthesis, error analysis, edge cases, and mastery challenges
    tailored specifically to the topic for Socratic Turn 3 (eliminates generic hints).
    """
    name_low = target_name.lower().strip()

    if any(k in name_low for k in ["root", "algebraic and transcendental", "algebraic", "transcendental", "bisection", "newton-raphson", "regula-falsi", "secant"]):
        return {
            "heading": "### 🚀 Advanced Synthesis & Master Challenge: Convergence, Pitfalls & Optimization",
            "explanation": (
                "Outstanding calculation! With $x_0 = 1.0$, Newton-Raphson gives $x_1 = \\frac{1 + 2}{2} = 1.5$. "
                "Just one more iteration yields $x_2 = \\frac{1.5 + 2/1.5}{2} = 1.4167$—matching $\\sqrt{2}$ to 3 decimal places in only two steps!\n\n"
                "**Comparative Method Synthesis**:\n\n"
                "| Method | Convergence Order | Rate | Guarantee | Key Weakness |\n"
                "|---|---|---|---|---|\n"
                "| **Bisection** | $p = 1$ | Linear (halving) | Always converges if $f(a)f(b) < 0$ | Slow (takes ~20 steps for 6 decimals) |\n"
                "| **Regula-Falsi** | $p = 1$ | Linear | Always converges | One bracket point can remain frozen |\n"
                "| **Newton-Raphson** | $p = 2$ | Quadratic (doubles digits) | Fast local convergence | Fails completely if $f'(x) \\approx 0$ or guess is far |\n\n"
                "**Crucial Failure Modes of Newton-Raphson**:\n"
                "1. **Stationary / Inflection Points**: If $f'(x_n) = 0$, division by zero causes the tangent to shoot to infinity.\n"
                "2. **Oscillatory Trapping**: Between roots, it can cycle endlessly between two points without ever converging.\n"
                "3. **Hybrid Remedy**: Production solvers (like Brent's Method) use Newton-Raphson for speed, but fallback to Bisection whenever an iteration lands outside the bracket!"
            ),
            "challenge": (
                "**Final Mastery Question!**\n\n"
                "Suppose you must find the root of a function where evaluating $f(x)$ takes 5 minutes per run on a supercomputer, "
                "and you cannot afford a divergence. Which method would you trust for a 100% foolproof guarantee?"
            ),
            "options": [
                "Bisection method (or Brent's hybrid) for 100% guaranteed bracket convergence",
                "Newton-Raphson method",
                "I'm ready for the practice quiz!"
            ]
        }
    elif any(k in name_low for k in ["probability", "distribution", "random variable"]):
        return {
            "heading": "### 🚀 Advanced Synthesis & Master Challenge: Central Limit Theorem & Family Map",
            "explanation": (
                "Accurate calculation! The expected value $E[X] = (0.2) + (0.9) + (1.05) = 2.15$.\n\n"
                "**The Master Distribution Map**:\n\n"
                "1. **Discrete Family**:\n"
                "- **Bernoulli**: Single trial with success probability $p$.\n"
                "- **Binomial $B(n, p)$**: Sum of $n$ independent Bernoulli trials. Mean $\\mu = np$, Variance $\\sigma^2 = np(1-p)$.\n"
                "- **Poisson $\\text{Pois}(\\lambda)$**: Models rare events over continuous time/space. Arises as $n \\to \\infty, p \\to 0$ with $\\lambda = np$.\n\n"
                "2. **Continuous Family & The Central Limit Theorem (CLT)**:\n"
                "- When you take the sum or average of $n$ independent random variables from ANY distribution with finite variance, "
                "as $n \\to \\infty$, the standardized sample mean converges to the Standard Normal Distribution $\\mathcal{N}(0, 1)$!\n"
                "- This is why bell curves appear everywhere across engineering, measurement error, and nature."
            ),
            "challenge": (
                "**Final Mastery Challenge!**\n\n"
                "If a factory produces microchips with an extremely low defect rate $p = 0.001$, and inspects a sample of $n = 3000$ chips, "
                "which distribution is the most efficient and mathematically appropriate to model the number of defective chips?"
            ),
            "options": [
                "Poisson distribution with lambda = 3.0",
                "Binomial distribution",
                "I'm ready for the practice quiz!"
            ]
        }
    elif any(k in name_low for k in ["curve fit", "curve-fit", "least square", "regression"]):
        return {
            "heading": "### 🚀 Advanced Synthesis & Master Challenge: Goodness of Fit & Non-Linear Transformations",
            "explanation": (
                "Spot on! With $b = 1.5$, substituting into $3a + 6(1.5) = 10$ yields $3a + 9 = 10 \\implies a = 1/3 \\approx 0.333$.\n"
                "The fitted regression line is $y = 0.333 + 1.5x$.\n\n"
                "**Evaluating Goodness of Fit ($R^2$)**:\n"
                "To determine how well the line explains the variation in the data, we compute the **Coefficient of Determination**:\n"
                "$$R^2 = 1 - \\frac{SS_{\\text{res}}}{SS_{\\text{tot}}} = 1 - \\frac{\\sum (y_i - \\hat{y}_i)^2}{\\sum (y_i - \\bar{y})^2}$$\n"
                "- $R^2 = 1.0$ indicates a perfect fit (every data point falls directly on the curve).\n"
                "- $R^2 = 0.0$ means the line explains none of the variation beyond the simple average $\\bar{y}$.\n\n"
                "**Fitting Non-Linear Curves via Transformation**:\n"
                "- Exponential: $y = a e^{bx} \\implies \\ln y = \\ln a + bx$ (fit $Y = A + bx$ where $Y = \\ln y, A = \\ln a$).\n"
                "- Power Law: $y = a x^b \\implies \\log y = \\log a + b \\log x$ (fit $Y = A + bX$ where $Y = \\log y, X = \\log x$)."
            ),
            "challenge": (
                "**Final Mastery Challenge!**\n\n"
                "Suppose biological bacterial growth follows $N(t) = N_0 e^{kt}$. If you have experimental data points $(t_i, N_i)$, "
                "what mathematical transformation should you apply to the vertical axis before running linear least squares?"
            ),
            "options": [
                "Take the natural logarithm ln(N_i) and plot against t_i",
                "Square each N_i",
                "I'm ready for the practice quiz!"
            ]
        }
    elif any(k in name_low for k in ["numerical integration", "simpson", "trapezoidal", "quadrature"]):
        return {
            "heading": "### 🚀 Advanced Synthesis & Master Challenge: Error Bounds, Richardson Extrapolation & Romberg",
            "explanation": (
                "Exactly right! A parabola requires 3 distinct points $(x_0, x_1, x_2)$, spanning across 2 subintervals. "
                "Thus, Simpson's 1/3 Rule mandates that $n$ is an even number.\n\n"
                "**Theoretical Error Comparison**:\n\n"
                "| Rule | Segment Degree | Error Formula | Accuracy Order |\n"
                "|---|---|---|---|\n"
                "| **Trapezoidal** | Degree 1 (Linear) | $E_T = -\\frac{(b-a)h^2}{12} f''(\\xi)$ | $\\mathcal{O}(h^2)$ |\n"
                "| **Simpson's 1/3** | Degree 2 (Parabolic) | $E_S = -\\frac{(b-a)h^4}{180} f^{(4)}(\\xi)$ | $\\mathcal{O}(h^4)$ |\n"
                "| **Simpson's 3/8** | Degree 3 (Cubic) | $E_{3/8} = -\\frac{(b-a)h^4}{80} f^{(4)}(\\xi)$ | $\\mathcal{O}(h^4)$ |\n\n"
                "**Surprising Mathematical Fact**:\n"
                "Notice that Simpson's 1/3 Rule has an error proportional to $f^{(4)}(\\xi)$ (the 4th derivative). "
                "This means Simpson's 1/3 Rule integrates **cubic polynomials $f(x) = ax^3 + bx^2 + cx + d$ with EXACT zero error**, "
                "even though it was only derived using degree-2 parabolas! The odd-degree error terms cancel symmetrically."
            ),
            "challenge": (
                "**Final Mastery Challenge!**\n\n"
                "If you halve the step size $h$ (from $h$ to $h/2$) when using Simpson's 1/3 Rule, by what factor does the theoretical truncation error decrease?"
            ),
            "options": [
                "Error decreases by a factor of 16 (2^4)",
                "Error decreases by a factor of 4 (2^2)",
                "I'm ready for the practice quiz!"
            ]
        }
    elif any(k in name_low for k in ["database", "sql", "normalization", "relational", "schema", "dbms"]):
        return {
            "heading": "### 🚀 Advanced Synthesis & Master Challenge: Lossless Decomposition & 3NF vs BCNF",
            "explanation": (
                "Spot on! In $R(A, B, C)$ with $A \\to B$ and $B \\to C$, $C$ is transitively dependent on $A$ through non-key $B$, which violates 3NF.\n\n"
                "To fix this, we decompose $R$ into two tables:\n"
                "- $R_1(A, B)$ with Primary Key $A$\n"
                "- $R_2(B, C)$ with Primary Key $B$\n\n"
                "**The Two Sacred Criteria for Valid Decomposition**:\n"
                "1. **Lossless-Join Property**: Natural join $R_1 \\bowtie R_2$ must produce exactly the original table $R$ with ZERO spurious (ghost) tuples. "
                "This is guaranteed if $R_1 \\cap R_2$ forms a candidate key for either $R_1$ or $R_2$. Here, $R_1 \\cap R_2 = \\{B\\}$, which is a key in $R_2$.\n"
                "2. **Dependency Preservation**: Every functional dependency in the original schema must be directly testable in one of the decomposed tables without requiring cross-table joins.\n\n"
                "**3NF vs Boyce-Codd Normal Form (BCNF)**:\n"
                "- **BCNF** is stricter: Every determinant $X$ in $X \\to Y$ MUST be a superkey.\n"
                "- **Trade-off**: 3NF always guarantees BOTH lossless-join and dependency preservation. BCNF guarantees lossless-join, but occasionally CANNOT preserve all dependencies!"
            ),
            "challenge": (
                "**Final Mastery Challenge!**\n\n"
                "What is the key advantage of maintaining a database schema in 3NF when BCNF would require dropping dependency preservation?"
            ),
            "options": [
                "3NF allows checking functional constraints without expensive multi-table joins",
                "3NF uses less disk space than BCNF",
                "I'm ready for the practice quiz!"
            ]
        }
    else:
        return {
            "heading": f"### 🚀 Advanced Synthesis & Master Challenge: {target_name}",
            "explanation": (
                f"You have demonstrated excellent foundational intuition and operational grasp of **{target_name}**!\n\n"
                f"**Master Synthesis & Best Practices**:\n"
                f"1. **Core Verification**: Always cross-check boundary conditions, edge cases, and assumptions before accepting results.\n"
                f"2. **Algorithmic Selection**: Match the specific tool or formula to the problem constraints (error tolerance, computation budget, sample size).\n"
                f"3. **Real-World Application**: Apply validation metrics to confirm the mathematical model accurately reflects physical reality."
            ),
            "challenge": (
                f"**You are fully prepared!**\n\n"
                f"Would you like to test your mastery with an adaptive practice quiz, or continue to the next curriculum topic?"
            ),
            "options": [
                "I'm ready for the adaptive practice quiz!",
                "Proceed to the next curriculum topic",
                "Review the operational formulas once more"
            ]
        }


class TeachingPlanner:
    """
    Generalized Topic-Agnostic Teaching Planner.
    Constructs an explicit pedagogical plan based on the 3-state target coverage model:
    - STATE_A_NOT_FOUND: Topic not in course material.
    - STATE_B_PARTIAL_INFO: Subtopics/operations exist, but no standalone definition.
    - STATE_C_SUFFICIENT_INFO: Complete source coverage available.
    """
    def create_plan(
        self,
        query: str,
        intent_info: Dict[str, Any],
        pedagogical_context: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]],
        tone: str = "Intuitive Analogy",
        conversation_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        intent = intent_info.get("intent", "EXPLAIN_CONCEPT")
        target_name = pedagogical_context.get("target_name") or "the requested concept"
        target_node = pedagogical_context.get("target_concept")
        coverage_state = pedagogical_context.get("target_coverage_state", "STATE_C_SUFFICIENT_INFO")
        missing_prereqs = pedagogical_context.get("missing_prerequisites", [])
        needs_bridge = pedagogical_context.get("needs_prereq_bridge", False)
        is_intro = pedagogical_context.get("is_introductory_request", False)
        target_found = pedagogical_context.get("target_found", True)

        raw_student_name = pedagogical_context.get("student_name")
        dummy_names = ["demo_student", "guest", "student", "jishnu", "default", "none", "elena", "elena scholar", "scholar", "user", "test", "admin"]
        student_name = raw_student_name if (raw_student_name and raw_student_name.strip().lower() not in dummy_names) else None
        domain = pedagogical_context.get("domain")
        if not domain:
            text_for_domain = f"{target_name} {pedagogical_context.get('course_id', '')}".lower()
            if any(w in text_for_domain for w in ["program", "code", "software", "python", "data structure", "algorithm", "os", "network"]):
                domain = "computer science"
            elif any(w in text_for_domain for w in ["physics", "quantum", "thermodynamics", "force", "mechanics"]):
                domain = "physics"
            else:
                domain = "mathematics"

        teaching_stage = "DIRECT_EXPLANATION"
        concepts_to_cover = []

        is_skip = intent_info.get("is_skip_ladder", False) or any(s in query.lower() for s in ["skip", "explain directly", "direct explanation", "just explain", "full explanation", "start explaining"])
        is_explain_pdf = intent_info.get("is_explain_pdf", False)

        # Count assistant messages to determine the Socratic inquiry layer
        socratic_turns = 0
        if conversation_history:
            for msg in conversation_history:
                sender = msg.get("sender") or msg.get("role")
                if sender in ("assistant", "socratic-guide"):
                    content = msg.get("content", "").lower()
                    if any(term in content for term in [
                        "what do you already know", "what do you think this topic is about",
                        "what do you think it is about", "clue #1", "hint #1", "first clue", "hint 1",
                        "clue #2", "hint #2", "second clue", "hint 2",
                        "first hint", "second hint", "third hint", "how much do you know about this topic",
                        "how much do you know about", "how familiar are you with", "before we start the topic let me know",
                        "before we dive in", "socratic layer 1", "socratic layer 2", "socratic layer 3",
                        "based on this clue", "based on this first hint", "now, what do you think",
                        "considering this second clue", "how do you think",
                        "what do you think now", "conceptual question", "conceptual check"
                    ]):
                        socratic_turns += 1

        if is_skip:
            teaching_stage = "CURRICULUM_STEP_1_BASICS"
            concepts_to_cover = [
                f"1. Direct Master Ground-Up Explanation: The user requested direct explanation. Provide a comprehensive explanation of {target_name} starting from the absolute basics, meaning, and definitions",
                f"2. Intuitive Mental Model, Real-World Use, & Notation Breakdown",
                f"3. Multimodal Table, Mermaid Flowchart/Diagram, and Practical Python Code Snippet",
                f"4. Next Topic Options: Present next topics for selection"
            ]
        elif socratic_turns == 0:
            teaching_stage = "SOCRATIC_LAYER_1_PROBE"
            greeting_phrase = f"Hello {student_name}!" if student_name else "Hello!"
            opening_hook = get_topic_opening_hook(target_name, domain)
            concepts_to_cover = [
                f"1. Greeting & Captivating Topic Hook: Greet with '{greeting_phrase}' and immediately present an engaging, inspiring 1-2 sentence hook tailored to {target_name} (e.g. '{opening_hook}'). DO NOT use canned formulas like '{target_name} is the topic' or '{target_name} is very fundamental'.",
                f"2. Prior Knowledge Check: Ask cleanly without repetition: 'Before we dive in, I\\'d love to know: how familiar are you with **{target_name}**?'",
                f"3. STRICT RULES: DO NOT dump definitions or mechanical explanations here. DO NOT include any '(Note: ...)' tips, warnings, or formulas. ZERO hints in this turn.",
                f"4. Quick Options: - [I am completely new to this topic, guide me step-by-step from zero], - [I have a rough idea, test my understanding], - [Skip hints & explain directly from basics to advanced]"
            ]
        elif socratic_turns == 1:
            teaching_stage = "SOCRATIC_LAYER_2_HINT_1"
            concepts_to_cover = [
                f"1. Validate Starting Perspective: Acknowledge the student's initial response warmly.",
                f"2. Thorough Ground-Up Conceptual Explanation of {target_name}: Explain what {target_name} fundamentally is from the absolute basics, why it is needed, how it operates, and an illustrative scenario. STRICT RULE: DO NOT label or call this a 'First Hint' or use the word 'hint' in the title or text! Use heading '### 🎯 Core Conceptual Foundation: {target_name}'.",
                f"3. Interactive Practice Challenge to Solve: Present a concrete, guided problem or thought question based on the concepts just explained for the student to solve and test their understanding.",
                f"4. Conclude with Clickable Quick Options (NO hint mentions): - [Let's solve this together step-by-step], - [I have an answer, let me explain], - [Show another practical example before solving]"
            ]
        elif socratic_turns == 2:
            teaching_stage = "SOCRATIC_LAYER_3_HINT_2"
            concepts_to_cover = [
                f"1. Evaluate Student's Solution: Warmly analyze their answer to the previous challenge and validate their logic.",
                f"2. Operational Deep-Dive & Formula Mechanics: Explain the detailed formulas, operational parameters, and mechanics of {target_name}.",
                f"3. Follow-up Challenge Problem: Present the next level problem for the student to solve.",
                f"4. Quick Options: - [Let's solve this together step-by-step], - [Show me the mathematical proof / formula], - [Explain directly from basics to advanced]"
            ]
        elif socratic_turns == 3:
            teaching_stage = "SOCRATIC_LAYER_4_HINT_3"
            concepts_to_cover = [
                f"1. Evaluate Student's Solution: Assess their operational reasoning and accuracy.",
                f"2. Advanced Structure, Multi-Method Comparison & Full Synthesis",
                f"3. Check for Complete Mastery: Ask if they feel confident and ready to tackle comprehensive exam-style problems or explore the next topic.",
                f"4. Quick Options: - [I'm ready! Move to the next topic], - [Give me a practice quiz question], - [Explain directly from basics to advanced]"
            ]
        elif socratic_turns >= 4:
            teaching_stage = "CURRICULUM_STEP_1_BASICS"
            concepts_to_cover = [
                f"1. Diagnostic Knowledge Synthesis: Synthesize student's diagnosed knowledge depth, acknowledge their level, and adapt teaching pace",
                f"2. Master Ground-Up Explanation: Explain {target_name} like a real-life human teacher starting from the absolute basics, meaning, and definitions",
                f"3. Multimodal Delivery: Structured comparison table, intuitive Mermaid diagram, and practical Python snippet",
                f"4. Check for Understanding & Bridge to Next Topic: Verify understanding and invite student to proceed to the next topic",
                f"5. Quick Options: - [I understand! Move to the next topic], - [Show a quick visual or numerical example], - [I have a question about this topic]"
            ]
        elif socratic_turns >= 4:
            teaching_stage = "CURRICULUM_STEP_1_BASICS"
            concepts_to_cover = [
                f"1. Diagnostic Knowledge Synthesis: Synthesize student's diagnosed knowledge depth across all 3 hints, acknowledge their level, and adapt teaching pace",
                f"2. Master Ground-Up Explanation: Explain {target_name} like a real-life human teacher starting from the absolute basics, meaning, and definitions",
                f"3. Multimodal Delivery: Structured comparison table, intuitive Mermaid diagram, and practical Python snippet",
                f"4. Check for Understanding & Bridge to Next Topic: Verify understanding and invite student to proceed to the next topic",
                f"5. Quick Options: - [I understand! Move to the next topic], - [Show a quick visual or numerical example], - [I have a question about this topic]"
            ]
        elif coverage_state == "STATE_A_NOT_FOUND" and not target_found:
            teaching_stage = "NOT_FOUND"
            concepts_to_cover = [f"Notification: '{target_name}' is not in course material"]
        elif coverage_state == "STATE_B_PARTIAL_INFO":
            teaching_stage = "PARTIAL_INFO"
            concepts_to_cover = [
                f"1. Context Notice: Uploaded material covers specific subtopics/operations for {target_name}, but lacks a full introductory definition.",
                f"2. Intuitive synthesis of available subtopic content from course material"
            ]
        elif intent in ["OVERVIEW", "SUMMARY"]:
            teaching_stage = "DOCUMENT_OVERVIEW"
            concepts_to_cover = [
                f"1. Big-Picture Framing: Core motivation, purpose, and central problem of {target_name}",
                f"2. Core Topics & Key Methods: Systematic breakdown of every major method, concept, and technique with formulas",
                f"3. Comparative Decision Matrix: When and why to choose each method over others"
            ]
        elif intent in ["SOLVE_PROBLEM", "EXAMPLE"]:
            teaching_stage = "SOLVE_PROBLEM"
            concepts_to_cover = [
                f"1. Problem Setup & Strategic Intuition for {target_name}",
                f"2. Chronological Step-by-Step Calculation with Explanations",
                f"3. Verification, Sanity Check, and Practical Takeaways"
            ]
        elif is_intro or intent in ["LEARN_CONCEPT", "DEFINITION"]:
            teaching_stage = "FOUNDATIONS_FIRST"
            t_lower = target_name.lower()
            q_lower = query.lower()

            if any(term in q_lower or term in t_lower for term in ["forward difference", "difference table", "difference operator", "finite difference"]):
                teaching_stage = "DIFFERENCE_OPERATORS"
                concepts_to_cover = [
                    f"1. Intuition & Definition of Finite Differences: Why we study rates of change across discrete tabular points",
                    f"2. The Forward Difference Operator $\\Delta$: First differences $\\Delta y_0 = y_1 - y_0$, second differences $\\Delta^2 y_0 = \\Delta y_1 - \\Delta y_0$",
                    f"3. Construction & Structure of the Forward Difference Table (Columns, diagonals, leading differences)",
                    f"4. Multimodal Table, Mermaid Flowchart/Diagram, and Python Code Snippet",
                    f"5. Next Topic Options: Newton's Forward Formula, Backward Differences, or Solving an Exercise"
                ]
            elif any(term in q_lower or term in t_lower for term in ["newton's forward", "newton forward", "interpolation formula", "formula derivation"]):
                teaching_stage = "INTERPOLATION_FORMULA"
                concepts_to_cover = [
                    f"1. Core Formulation: Newton's Forward Difference Interpolation Formula",
                    f"2. Symbol Breakdown & Step Parameter $p = \\frac{{x - x_0}}{{h}}$",
                    f"3. Conditions for Use: Equispaced points, target $x$ near the start of the table",
                    f"4. Multimodal Formula Table, Diagram, and Python Snippet",
                    f"5. Next Topic Options: Step-by-Step Worked Example, Newton's Backward Formula, or Practice Exercises"
                ]
            elif any(term in t_lower for term in ["interpolation", "numerical", "integration"]):
                concepts_to_cover = [
                    f"1. Core Concept & Motivation: What {target_name} actually is, the central problem of estimating intermediate values, and real-world intuition",
                    f"2. Foundational Terminology & Notation: Independent variables / arguments $x$, dependent variables / entries $y = f(x)$, step size $h = x_{{i+1}} - x_i$, and tabular observations",
                    f"3. Crucial Distinction: Interpolation (within range $[x_0, x_n]$) vs Extrapolation (outside range, high error risk)",
                    f"4. Multimodal Comparison Table, Mermaid Diagram/Flowchart, and Python Code Snippet",
                    f"5. Next Topic Options: Present next topics (Forward Differences, Difference Table, Newton's Formula, Exercises) for the student to select"
                ]
            else:
                c_type = target_node.concept_type if target_node else "concept"
                if c_type in ["algorithm", "procedure"]:
                    concepts_to_cover = [
                        f"1. Intuitive Hook & The Fundamental Problem {target_name} Solves",
                        f"2. Elementary Prerequisite Tools & Notation Breakdown",
                        f"3. Step-by-Step Mechanism with Annotated Worked Example"
                    ]
                elif c_type in ["formula", "theorem", "principle"]:
                    concepts_to_cover = [
                        f"1. Intuitive Mental Model: Why does {target_name} exist?",
                        f"2. Foundational Prerequisite Tools & Definition of Notation",
                        f"3. Formal Equation, Symbol Dissection & Step-by-Step Application"
                    ]
                else:
                    concepts_to_cover = [
                        f"1. Intuitive Mental Model & Real-World Analogy for {target_name}",
                        f"2. Foundational Definitions, Mathematical Mechanism & Notation",
                        f"3. Practical Step-by-Step Worked Example & Socratic Check-in"
                    ]
        elif needs_bridge and missing_prereqs:
            teaching_stage = "PREREQUISITE_BRIDGE"
            p_names = ", ".join([p.name for p in missing_prereqs[:2]])
            concepts_to_cover = [
                f"1. Brief Prerequisite Bridge ({p_names})",
                f"2. Main Topic: {target_name}"
            ]
        else:
            teaching_stage = "FOUNDATIONS_FIRST"
            concepts_to_cover = [
                f"1. Elementary Definitions & Core Foundation for {target_name}",
                f"2. Prerequisite Tools, Difference Operators & Notation",
                f"3. Concrete Step-by-Step Application & Next Steps"
            ]

        # Tone-specific pedagogical instructions
        tone_map = {
            "Basics to Advanced": (
                "CRITICAL INSTRUCTION - BASICS TO ADVANCED (ONE LEVEL AT A TIME):\n"
                "Teach sequentially like an expert human teacher! "
                "Explain the foundational concept first (arguments, entries, step size, table vs formula, interpolation vs extrapolation) with rich tables, diagrams, and code snippets. "
                "Do NOT leap directly to advanced formulas or long numerical examples in the first turn. "
                "Instead, explain the basics thoroughly, and conclude by presenting clear next-topic options for the student to choose from."
            ),
            "Intuitive Analogy": (
                "Lead with an intuitive, memorable real-world analogy before presenting any formula. "
                "Demystify abstract math symbols by connecting them to tangible everyday physical processes."
            ),
            "Step-by-Step Worked Examples": (
                "Focus on clear step-by-step problem-solving recipes. Construct intermediate tools (like difference tables) "
                "with annotated arithmetic before calculating final values."
            ),
            "Socratic First Principles": (
                "Deconstruct the concept down to fundamental axioms. Ask guiding questions that lead the "
                "student to deduce the conclusion themselves, emphasizing why each step is logically necessary."
            ),
            "Mathematical Formalism": (
                "Deliver rigorous mathematical precision: clearly state theorem conditions, assumptions, "
                "domain/boundary constraints, and step-by-step analytical derivations."
            ),
            "Exam Prep & High-Yield": (
                "Focus on high-yield exam takeaways: provide quick checklists, common exam traps, "
                "memorization tricks, and efficient step-by-step problem-solving templates."
            ),
        }
        tone_directive = tone_map.get(tone, tone_map.get("Basics to Advanced", tone_map["Intuitive Analogy"]))

        # Learner Memory Scaffolding (Weak Topic Support & Misconception Remediation)
        learner_profile = pedagogical_context.get("learner_profile") or {}
        weak_topics = [wt.get("topic_name") if isinstance(wt, dict) else wt for wt in learner_profile.get("weak_topics", [])]
        active_misconceptions = [m.get("text") if isinstance(m, dict) else m for m in learner_profile.get("active_misconceptions", [])]
        is_target_weak = any(target_name.lower() in wt.lower() or wt.lower() in target_name.lower() for wt in weak_topics)

        personalization_directives = []
        if is_target_weak:
            personalization_directives.append(
                f"- LEARNER SCAFFOLDING NOTE: The student has shown lower historical mastery in '{target_name}'. "
                "Explain foundational prerequisites gently, use a tangible sensory or visual analogy, and unpack basic arithmetic steps without rushing."
            )
        if active_misconceptions:
            misc_summary = "; ".join(active_misconceptions[:2])
            personalization_directives.append(
                f"- MISCONCEPTION REMEDIATION: The student previously struggled with: [{misc_summary}]. "
                "Explicitly point out the correct conceptual intuition and address this common pitfall without being condescending."
            )

        check_question = f"Would you like to solve a practice problem on {target_name} together, or examine a specific calculation step?"

        return {
            "query": query,
            "intent": intent,
            "target_name": target_name,
            "target_found": target_found,
            "coverage_state": coverage_state,
            "teaching_stage": teaching_stage,
            "concepts_to_cover": concepts_to_cover,
            "retrieved_chunks": retrieved_chunks,
            "needs_bridge": needs_bridge,
            "check_question": check_question,
            "personalization_directives": personalization_directives,
            "student_name": student_name,
            "domain": domain,
            "tone": tone,
            "tone_directive": tone_directive
        }
