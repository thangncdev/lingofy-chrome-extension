<?php
header('Content-Type: application/json');
header('Content-Disposition: attachment; filename="vocabulary.json"');
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

readfile('vocabulary.json');
?> 